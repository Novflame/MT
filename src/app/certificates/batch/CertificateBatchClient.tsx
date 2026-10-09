"use client";
import {
  CertificatePrintablePage,
  type CertificateData,
} from "../[enrollmentId]/CertificateClient";

import "../[enrollmentId]/CertificateClient.css";

type CertificateBatchClientProps = {
  certificates: CertificateData[];
  language: "ar" | "en" | "fr";
};

export function CertificateBatchClient({
  certificates,
  language,
}: CertificateBatchClientProps) {
  function handlePrint() {
    window.print();
  }

  return (
    <main className="certificate-batch-container">
      <header className="certificate-batch-toolbar">
        <div>
          <h1>
            {language === "ar"
              ? "طباعة شهادات نهاية العام"
              : language === "fr"
                ? "Impression des certificats de fin d’année"
                : "Print End-of-Year Certificates"}
          </h1>

          <p>
            {language === "ar"
              ? `عدد الشهادات: ${certificates.length}`
              : language === "fr"
                ? `Nombre de certificats : ${certificates.length}`
                : `Number of certificates: ${certificates.length}`}
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="certificate-batch-print-button"
        >
          {language === "ar"
            ? "طباعة جميع الشهادات"
            : language === "fr"
              ? "Imprimer tous les certificats"
              : "Print All Certificates"}
        </button>
      </header>

      <div className="certificate-batch-list">
        {certificates.map((certificate) => (
          <div
            key={certificate.student.id}
            className="certificate-batch-item"
          >
            <CertificatePrintablePage
              certificate={certificate}
              locale={language}
            />
          </div>
        ))}
      </div>
    </main>
  );
}