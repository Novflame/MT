    const statusEl = document.getElementById("status");
    const englishEl = document.getElementById("english");
    const spinner = document.getElementById("spinner");
    const retryButton = document.getElementById("retry");
    const serversEl = document.getElementById("servers");
    const invoke = window.__TAURI__.core.invoke;

    function showError(message) {
      spinner.classList.add("hidden");
      statusEl.textContent = message;
      englishEl.textContent = "Make sure you are connected to the school's network and that the TASEETY server is running.";
      retryButton.classList.add("visible");
    }

    async function connect(server) {
      retryButton.disabled = true;
      statusEl.textContent = "تم العثور على الخادم. جاري الاتصال...";
      englishEl.textContent = "Server found. Connecting...";
      try {
        await invoke("save_server", { serverUrl: server.baseUrl });
        window.location.replace(server.baseUrl);
      } catch (error) {
        showError("Unable to save or connect to the selected server.");
        retryButton.disabled = false;
        console.error(error);
      }
    }

    async function discover() {
      retryButton.classList.remove("visible");
      retryButton.disabled = false;
      serversEl.replaceChildren();
      spinner.classList.remove("hidden");
      statusEl.textContent = "جاري البحث عن خادم المدرسة...";
      englishEl.textContent = "Searching for the TASEETY school server...";
      try {
        const servers = await invoke("discover_servers");
        if (!servers.length) {
          showError("لم يتم العثور على خادم TASEETY.");
          return;
        }
        if (servers.length === 1) {
          await connect(servers[0]);
          return;
        }

        spinner.classList.add("hidden");
        statusEl.textContent = "تم العثور على أكثر من خادم. اختر المدرسة:";
        englishEl.textContent = "More than one TASEETY server was found. Select your school:";
        for (const server of servers) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "server";
          button.textContent = server.serverName || "TASEETY";
          const small = document.createElement("small");
          small.textContent = server.baseUrl;
          button.appendChild(small);
          button.addEventListener("click", () => connect(server));
          serversEl.appendChild(button);
        }
      } catch (error) {
        showError("تعذر الاتصال بالشبكة المحلية.");
        console.error(error);
      }
    }

    retryButton.addEventListener("click", discover);
    discover();
