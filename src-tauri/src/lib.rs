use serde::{Deserialize, Serialize};
use std::{
    fs,
    net::{Ipv4Addr, UdpSocket},
    path::PathBuf,
    time::{Duration, Instant},
};
use tauri::{AppHandle, Manager};
use url::Url;

const DISCOVERY_GROUP: &str = "239.255.77.77";
const DISCOVERY_PORT: u16 = 47777;
const DISCOVERY_REQUEST: &[u8] = b"TASEETY_DISCOVER_V1";
const DISCOVERY_WINDOW: Duration = Duration::from_secs(4);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DiscoveredServer {
    server_id: String,
    server_name: String,
    base_url: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DiscoveryPacket {
    service: String,
    protocol_version: u8,
    server_id: String,
    server_name: String,
    base_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SavedServer {
    base_url: String,
}

fn is_private_ipv4(ip: Ipv4Addr) -> bool {
    let [a, b, _, _] = ip.octets();

    (a == 10)
        || (a == 172 && (16..=31).contains(&b))
        || (a == 192 && b == 168)
}

fn validate_server_url(raw: &str) -> Result<Url, String> {
    let url = Url::parse(raw).map_err(|_| "The discovered server URL is invalid.".to_string())?;

    if url.scheme() != "http" && url.scheme() != "https" {
        return Err("The discovered server must use HTTP or HTTPS.".into());
    }

    if !url.username().is_empty() || url.password().is_some() {
        return Err("Credentials are not allowed in a server URL.".into());
    }

    let host = url
        .host_str()
        .ok_or_else(|| "The discovered server has no host.".to_string())?;

    let ip: Ipv4Addr = host
        .parse()
        .map_err(|_| "The server did not advertise a private IPv4 address.".to_string())?;

    if !is_private_ipv4(ip) {
        return Err("The discovered address is not a private LAN address.".into());
    }

    if url.path() != "/" && !url.path().is_empty() {
        return Err("The server URL must point to the site root.".into());
    }

    Ok(url)
}

fn server_is_healthy(raw_url: &str) -> bool {
    let Ok(url) = validate_server_url(raw_url) else {
        return false;
    };

    let Ok(client) = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(2))
        .redirect(reqwest::redirect::Policy::none())
        .build()
    else {
        return false;
    };

    client
        .get(url.as_str())
        .send()
        .map(|response| response.status().is_success())
        .unwrap_or(false)
}

fn config_file(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not locate application data: {error}"))?;

    fs::create_dir_all(&directory)
        .map_err(|error| format!("Could not create application data directory: {error}"))?;

    Ok(directory.join("server.json"))
}

fn load_saved_server(app: &AppHandle) -> Option<DiscoveredServer> {
    let path = config_file(app).ok()?;
    let contents = fs::read_to_string(path).ok()?;
    let saved: SavedServer = serde_json::from_str(&contents).ok()?;

    let url = validate_server_url(&saved.base_url).ok()?;
    if !server_is_healthy(url.as_str()) {
        return None;
    }

    Some(DiscoveredServer {
        server_id: "saved".into(),
        server_name: url.host_str()?.to_string(),
        base_url: url.origin().ascii_serialization(),
    })
}

fn discover_servers_blocking(app: AppHandle) -> Result<Vec<DiscoveredServer>, String> {
    // Prefer the last successfully selected school server when it is reachable.
    if let Some(saved) = load_saved_server(&app) {
        return Ok(vec![saved]);
    }

    let socket = UdpSocket::bind("0.0.0.0:0")
        .map_err(|error| format!("Could not open LAN discovery socket: {error}"))?;

    socket
        .set_multicast_ttl_v4(1)
        .map_err(|error| format!("Could not configure LAN discovery: {error}"))?;

    socket
        .send_to(
            DISCOVERY_REQUEST,
            format!("{DISCOVERY_GROUP}:{DISCOVERY_PORT}"),
        )
        .map_err(|error| format!("Could not search the local network: {error}"))?;

    let deadline = Instant::now() + DISCOVERY_WINDOW;
    let mut buffer = [0_u8; 4096];
    let mut found: Vec<DiscoveredServer> = Vec::new();

    while Instant::now() < deadline {
        let remaining = deadline.saturating_duration_since(Instant::now());
        socket
            .set_read_timeout(Some(remaining.min(Duration::from_millis(350))))
            .map_err(|error| format!("Could not configure discovery timeout: {error}"))?;

        match socket.recv_from(&mut buffer) {
            Ok((length, _source)) => {
                let Ok(packet) = serde_json::from_slice::<DiscoveryPacket>(&buffer[..length]) else {
                    continue;
                };

                if packet.service != "taseety" || packet.protocol_version != 1 {
                    continue;
                }

                let Ok(url) = validate_server_url(&packet.base_url) else {
                    continue;
                };

                let base_url = url.origin().ascii_serialization();
                if found.iter().any(|server| server.base_url == base_url) {
                    continue;
                }

                if server_is_healthy(&base_url) {
                    found.push(DiscoveredServer {
                        server_id: packet.server_id,
                        server_name: packet.server_name,
                        base_url,
                    });
                }
            }
            Err(error)
                if error.kind() == std::io::ErrorKind::WouldBlock
                    || error.kind() == std::io::ErrorKind::TimedOut =>
            {
                continue;
            }
            Err(error) => {
                return Err(format!("LAN discovery failed: {error}"));
            }
        }
    }

    Ok(found)
}

#[tauri::command]
async fn discover_servers(app: AppHandle) -> Result<Vec<DiscoveredServer>, String> {
    tauri::async_runtime::spawn_blocking(move || discover_servers_blocking(app))
        .await
        .map_err(|error| format!("Discovery task failed: {error}"))?
}

#[tauri::command]
async fn save_server(app: AppHandle, server_url: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let url = validate_server_url(&server_url)?;
        let base_url = url.origin().ascii_serialization();

        if !server_is_healthy(&base_url) {
            return Err("The selected TASEETY server is not responding.".into());
        }

        let path = config_file(&app)?;
        let saved = SavedServer { base_url };

        let json = serde_json::to_string_pretty(&saved)
            .map_err(|error| format!("Could not save server selection: {error}"))?;

        fs::write(path, json)
            .map_err(|error| format!("Could not save server selection: {error}"))?;

        Ok(())
    })
    .await
    .map_err(|error| format!("Save task failed: {error}"))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![discover_servers, save_server])
        .run(tauri::generate_context!())
        .expect("error while running TASEETY");
}
