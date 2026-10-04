"use client";
import Image from "next/image";
import { useState } from "react";

type CertificateData = {
  school: {
    id: number;
    name: string;
    logo: string | null;
  };

  certificate: {
    issueDate: string;

    academicYear: {
      id: string;
      name: string;
      startDate: string;
      endDate: string;
    };
  };

  student: {
    id: string;
    name: string;
  };

  class: {
    id: string;
    name: string;
    gradeLevel: number;
  };

  result: {
    status: "complete" | "incomplete";
    totalScore: number;
    totalMaxScore: number;
    percentage: number;

    subjects: {
      subjectId: string;
      subjectName: string;
      examId: string;
      score: number;
      maxScore: number;
      percentage: number;
    }[];
  };

  notes: string | null;

  signatures: {
    headOfClass: {
      id: string | null;
      name: string | null;
    };

    principal: {
      id: string | null;
      name: string | null;
    };
  };
};

type CertificateClientProps = {
  certificate: CertificateData;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export default function CertificateClient({
  certificate,
}: CertificateClientProps) {
  const [flipped, setFlipped] = useState(false);

  function handlePrint() {
    window.print();
  }

  return (
    <main className="certificate-page">
      {/* =====================================================
                TOP BAR
            ===================================================== */}

      <header className="certificate-toolbar">
        <div>
          <div className="certificate-eyebrow">ACADEMIC DOCUMENT</div>

          <h1>Certificate Preview</h1>

          <p>
            {certificate.student.name}
            {" · "}
            {certificate.class.name}
          </p>
        </div>

        <div className="certificate-actions">
          <button
            type="button"
            onClick={() => setFlipped((value) => !value)}
            className="flip-button"
          >
            {flipped ? "Show Front" : "Flip Certificate"}
          </button>

          <button type="button" onClick={handlePrint} className="print-button">
            Print / PDF
          </button>
        </div>
      </header>

      {/* =====================================================
                DESKTOP CERTIFICATE
            ===================================================== */}

      <section className="certificate-stage desktop-certificate">
        <CertificateFront certificate={certificate} />
      </section>

      {/* =====================================================
                MOBILE CERTIFICATE
            ===================================================== */}

      <section className="mobile-certificate-area">
        <div className="mobile-hint">
          Tap the certificate or use the button to flip
        </div>

        <div
          className={[
            "certificate-flip-container",
            flipped ? "is-flipped" : "",
          ].join(" ")}
          onClick={() => setFlipped((value) => !value)}
        >
          <div className="certificate-flip-inner">
            {/* FRONT */}

            <div className="certificate-face certificate-front">
              <CertificateFront certificate={certificate} />
            </div>

            {/* BACK */}

            <div className="certificate-face certificate-back">
              <CertificateBack certificate={certificate} />
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
                MOBILE INFORMATION
            ===================================================== */}

      <section className="mobile-info">
        <div>
          <span>Academic Year</span>
          <strong>{certificate.certificate.academicYear.name}</strong>
        </div>

        <div>
          <span>Result</span>
          <strong>{certificate.result.status}</strong>
        </div>

        <div>
          <span>Percentage</span>
          <strong>{certificate.result.percentage}%</strong>
        </div>
      </section>
    </main>
  );
}

/* ================================================================
   FRONT OF CERTIFICATE
================================================================ */

function CertificateFront({ certificate }: { certificate: CertificateData }) {
  return (
    <article id="certificate" className="certificate-paper">
      {/* Decorative borders */}

      <div className="certificate-border-outer" />
      <div className="certificate-border-inner" />

      {/* Watermark */}

      <div className="certificate-watermark">
        {certificate.school.logo ? (
          <Image src={certificate.school.logo} alt="" />
        ) : (
          <span>{certificate.school.name}</span>
        )}
      </div>

      <div className="certificate-content">
        {/* =================================================
                    HEADER
                ================================================= */}

        <header className="certificate-header">
          <div className="certificate-logo">
            {certificate.school.logo ? (
              <Image
                src={certificate.school.logo}
                alt={certificate.school.name}
              />
            ) : (
              <span>{getInitials(certificate.school.name)}</span>
            )}
          </div>

          <div className="certificate-heading">
            <div className="school-name">{certificate.school.name}</div>

            <h2>Academic Certificate</h2>

            <p>Academic Year {certificate.certificate.academicYear.name}</p>
          </div>
        </header>

        {/* =================================================
                    STUDENT INFORMATION
                ================================================= */}

        <div className="student-grid">
          <CertificateInfo label="Student" value={certificate.student.name} />

          <CertificateInfo label="Class" value={certificate.class.name} />

          <CertificateInfo
            label="Grade"
            value={String(certificate.class.gradeLevel)}
          />

          <CertificateInfo
            label="Issue Date"
            value={formatDate(certificate.certificate.issueDate)}
          />
        </div>

        {/* =================================================
                    RESULTS
                ================================================= */}

        <div className="results-table">
          <table>
            <thead>
              <tr>
                <th>#</th>

                <th>Subject</th>

                <th>Score</th>

                <th>Maximum</th>

                <th>%</th>
              </tr>
            </thead>

            <tbody>
              {certificate.result.subjects.map((subject, index) => (
                <tr key={subject.examId}>
                  <td>{index + 1}</td>

                  <td className="subject-name">{subject.subjectName}</td>

                  <td>{subject.score}</td>

                  <td>{subject.maxScore}</td>

                  <td>{subject.percentage}%</td>
                </tr>
              ))}

              {certificate.result.subjects.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-results">
                    No subject results available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* =================================================
                    SUMMARY
                ================================================= */}

        <div className="result-summary">
          <ResultBox
            label="Total"
           value={`${certificate.result.totalScore} / ${certificate.result.totalMaxScore}`}
          />

          <ResultBox
            label="Percentage"
            value={`${certificate.result.percentage}%`}
          />

          <ResultBox label="Result" value={certificate.result.status} />
        </div>

        {/* =================================================
                    FOOTER
                ================================================= */}

        <div className="certificate-footer">
          <Signature
            title="Head of Class"
            name={certificate.signatures.headOfClass.name}
          />

          <div className="certificate-note">
            <span>Official Academic Record</span>

            {certificate.notes && <small>{certificate.notes}</small>}
          </div>

          <Signature
            title="Principal"
            name={certificate.signatures.principal.name}
          />
        </div>
      </div>
    </article>
  );
}

/* ================================================================
   BACK OF CERTIFICATE
================================================================ */

function CertificateBack({ certificate }: { certificate: CertificateData }) {
  return (
    <article className="certificate-paper certificate-back-paper">
      <div className="certificate-border-outer" />
      <div className="certificate-border-inner" />

      <div className="back-content">
        {/* Header */}

        <div className="back-header">
          <div className="back-logo">
            {certificate.school.logo ? (
              <img src={certificate.school.logo} alt="" />
            ) : (
              <span>{getInitials(certificate.school.name)}</span>
            )}
          </div>

          <div>
            <div className="school-name">{certificate.school.name}</div>

            <h2>Academic Record</h2>

            <p>{certificate.certificate.academicYear.name}</p>
          </div>
        </div>

        {/* Student */}

        <div className="back-student">
          <span>STUDENT</span>

          <strong>{certificate.student.name}</strong>
        </div>

        {/* Subject results */}

        <div className="back-results">
          <h3>Academic Performance</h3>

          {certificate.result.subjects.map((subject) => (
            <div key={subject.examId} className="back-subject">
              <span>{subject.subjectName}</span>

              <div className="score-bar">
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, subject.percentage))}%`,
                  }}
                />
              </div>

              <strong>{subject.percentage}%</strong>
            </div>
          ))}
        </div>

        {/* Overall result */}

        <div className="back-overall">
          <div>
            <span>Overall Score</span>

            <strong>
              {certificate.result.totalScore}
              {" / "}
              {certificate.result.totalMaxScore}
            </strong>
          </div>

          <div>
            <span>Percentage</span>

            <strong>{certificate.result.percentage}%</strong>
          </div>

          <div>
            <span>Status</span>

            <strong>{certificate.result.status}</strong>
          </div>
        </div>

        {/* Footer */}

        <div className="back-footer">
          <div>
            Issued
            <strong>{formatDate(certificate.certificate.issueDate)}</strong>
          </div>

          <div>
            Academic Year
            <strong>{certificate.certificate.academicYear.name}</strong>
          </div>

          <div>
            Class
            <strong>{certificate.class.name}</strong>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ================================================================
   SMALL COMPONENTS
================================================================ */

function CertificateInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="certificate-info">
      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

function ResultBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="result-box">
      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

function Signature({ title, name }: { title: string; name: string | null }) {
  return (
    <div className="signature">
      <div className="signature-line" />

      <strong>{title}</strong>

      <span>{name || " "}</span>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}
