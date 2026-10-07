
"use client";

import Image from "next/image";
import { useState } from "react";

import { useLanguage } from "@/components/providers/LanguageProvider";

import "./CertificateClient.css";

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

function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(
    locale === "ar"
      ? "ar"
      : locale === "fr"
        ? "fr-FR"
        : "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(new Date(date));
}

export default function CertificateClient({
  certificate,
}: CertificateClientProps) {
  const { locale, direction } = useLanguage();

  const [flipped, setFlipped] = useState(false);

  const t = getTranslations(locale);

  function handlePrint() {
    window.print();
  }

  return (
    <main
      className="certificate-page"
      dir={direction}
    >
      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <header className="certificate-toolbar">
        <div className="certificate-toolbar-content">
          <div className="certificate-toolbar-copy">
            <div className="certificate-eyebrow">
              {t.academicDocument}
            </div>

            <h1>{t.certificatePreview}</h1>

            <p>
              {certificate.student.name}
              {" · "}
              {certificate.class.name}
            </p>
          </div>

          <div className="certificate-actions">
            <button
              type="button"
              onClick={() =>
                setFlipped((value) => !value)
              }
              className="flip-button"
            >
              {flipped
                ? t.showFront
                : t.flipCertificate}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="print-button"
            >
              {t.printPdf}
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          DESKTOP CERTIFICATE
      ===================================================== */}

      <section className="certificate-stage desktop-certificate">
        <CertificateFront
          certificate={certificate}
          t={t}
          locale={locale}
        />
      </section>

      {/* =====================================================
          MOBILE CERTIFICATE
      ===================================================== */}

      <section className="mobile-certificate-area">
        <div className="mobile-hint">
          {t.mobileFlipHint}
        </div>

        <div
          className={[
            "certificate-flip-container",
            flipped ? "is-flipped" : "",
          ].join(" ")}
          onClick={() =>
            setFlipped((value) => !value)
          }
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" ||
              event.key === " "
            ) {
              event.preventDefault();

              setFlipped((value) => !value);
            }
          }}
        >
          <div className="certificate-flip-inner">
            {/* FRONT */}

            <div className="certificate-face certificate-front">
              <CertificateFront
                certificate={certificate}
                t={t}
                locale={locale}
              />
            </div>

            {/* BACK */}

            <div className="certificate-face certificate-back">
              <CertificateBack
                certificate={certificate}
                t={t}
                locale={locale}
              />
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          MOBILE INFORMATION
      ===================================================== */}

      <section className="mobile-info">
        <div>
          <span>{t.academicYear}</span>

          <strong>
            {certificate.certificate.academicYear.name}
          </strong>
        </div>

        <div>
          <span>{t.result}</span>

          <strong
            className={
              certificate.result.status === "complete"
                ? "result-complete"
                : "result-incomplete"
            }
          >
            {getResultStatus(
              certificate.result.status,
              locale,
            )}
          </strong>
        </div>

        <div>
          <span>{t.percentage}</span>

          <strong>
            {certificate.result.percentage}%
          </strong>
        </div>
      </section>
    </main>
  );
}

/* ================================================================
   FRONT
================================================================ */

function CertificateFront({
  certificate,
  t,
  locale,
}: {
  certificate: CertificateData;
  t: CertificateTranslations;
  locale: "en" | "ar" | "fr";
}) {
  return (
    <article id="certificate" className="certificate-paper">
      <div className="certificate-border-outer" />
      <div className="certificate-border-inner" />

      {/* Watermark */}

      <div className="certificate-watermark">
        {certificate.school.logo ? (
          <Image
            src={certificate.school.logo}
            alt=""
            width={260}
            height={260}
          />
        ) : (
          <span>{certificate.school.name}</span>
        )}
      </div>

      <div className="certificate-content">
        {/* HEADER */}

        <header className="certificate-header">
          <div className="certificate-logo">
            {certificate.school.logo ? (
              <Image
                src={certificate.school.logo}
                alt={certificate.school.name}
                width={90}
                height={90}
              />
            ) : (
              <span>
                {getInitials(
                  certificate.school.name,
                )}
              </span>
            )}
          </div>

          <div className="certificate-heading">
            <div className="school-name">
              {certificate.school.name}
            </div>

            <h2>{t.academicCertificate}</h2>

            <p>
              {t.academicYear}{" "}
              {certificate.certificate.academicYear.name}
            </p>
          </div>
        </header>

        {/* STUDENT INFORMATION */}

        <div className="student-grid">
          <CertificateInfo
            label={t.student}
            value={certificate.student.name}
          />

          <CertificateInfo
            label={t.class}
            value={certificate.class.name}
          />

          <CertificateInfo
            label={t.grade}
            value={String(
              certificate.class.gradeLevel,
            )}
          />

          <CertificateInfo
            label={t.issueDate}
            value={formatDate(
              certificate.certificate.issueDate,
              locale,
            )}
          />
        </div>

        {/* RESULTS */}

        <div className="results-table">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{t.subject}</th>
                <th>{t.score}</th>
                <th>{t.maximum}</th>
                <th>%</th>
              </tr>
            </thead>

            <tbody>
              {certificate.result.subjects.map(
                (subject, index) => (
                  <tr key={subject.examId}>
                    <td>{index + 1}</td>

                    <td className="subject-name">
                      {subject.subjectName}
                    </td>

                    <td>{subject.score}</td>

                    <td>{subject.maxScore}</td>

                    <td>
                      {subject.percentage}%
                    </td>
                  </tr>
                ),
              )}

              {certificate.result.subjects.length ===
                0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="empty-results"
                  >
                    {t.noSubjectResults}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* SUMMARY */}

        <div className="result-summary">
          <ResultBox
            label={t.total}
            value={`${certificate.result.totalScore} / ${certificate.result.totalMaxScore}`}
          />

          <ResultBox
            label={t.percentage}
            value={`${certificate.result.percentage}%`}
          />

          <ResultBox
            label={t.result}
            value={getResultStatus(
              certificate.result.status,
              locale,
            )}
            status={certificate.result.status}
          />
        </div>

        {/* FOOTER */}

        <div className="certificate-footer">
          <Signature
            title={t.headOfClass}
            name={
              certificate.signatures.headOfClass
                .name
            }
          />

          <div className="certificate-note">
            <span>{t.officialAcademicRecord}</span>

            {certificate.notes && (
              <small>
                {certificate.notes}
              </small>
            )}
          </div>

          <Signature
            title={t.principal}
            name={
              certificate.signatures.principal.name
            }
          />
        </div>
      </div>
    </article>
  );
}

/* ================================================================
   BACK
================================================================ */

function CertificateBack({
  certificate,
  t,
  locale,
}: {
  certificate: CertificateData;
  t: CertificateTranslations;
  locale: "en" | "ar" | "fr";
}) {
  return (
    <article className="certificate-paper certificate-back-paper">
      <div className="certificate-border-outer" />
      <div className="certificate-border-inner" />

      <div className="back-content">
        {/* HEADER */}

        <div className="back-header">
          <div className="back-logo">
            {certificate.school.logo ? (
              <Image
                src={certificate.school.logo}
                alt=""
                width={70}
                height={70}
              />
            ) : (
              <span>
                {getInitials(
                  certificate.school.name,
                )}
              </span>
            )}
          </div>

          <div>
            <div className="school-name">
              {certificate.school.name}
            </div>

            <h2>{t.academicRecord}</h2>

            <p>
              {certificate.certificate.academicYear.name}
            </p>
          </div>
        </div>

        {/* STUDENT */}

        <div className="back-student">
          <span>{t.student}</span>

          <strong>
            {certificate.student.name}
          </strong>
        </div>

        {/* SUBJECT RESULTS */}

        <div className="back-results">
          <h3>{t.academicPerformance}</h3>

          {certificate.result.subjects.map(
            (subject) => (
              <div
                key={subject.examId}
                className="back-subject"
              >
                <span>
                  {subject.subjectName}
                </span>

                <div className="score-bar">
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          subject.percentage,
                        ),
                      )}%`,
                    }}
                  />
                </div>

                <strong>
                  {subject.percentage}%
                </strong>
              </div>
            ),
          )}

          {certificate.result.subjects.length ===
            0 && (
            <p className="back-empty">
              {t.noSubjectResults}
            </p>
          )}
        </div>

        {/* OVERALL */}

        <div className="back-overall">
          <div>
            <span>{t.overallScore}</span>

            <strong>
              {certificate.result.totalScore}
              {" / "}
              {certificate.result.totalMaxScore}
            </strong>
          </div>

          <div>
            <span>{t.percentage}</span>

            <strong>
              {certificate.result.percentage}%
            </strong>
          </div>

          <div>
            <span>{t.status}</span>

            <strong
              className={
                certificate.result.status ===
                "complete"
                  ? "result-complete"
                  : "result-incomplete"
              }
            >
              {getResultStatus(
                certificate.result.status,
                locale,
              )}
            </strong>
          </div>
        </div>

        {/* FOOTER */}

        <div className="back-footer">
          <div>
            {t.issued}

            <strong>
              {formatDate(
                certificate.certificate.issueDate,
                locale,
              )}
            </strong>
          </div>

          <div>
            {t.academicYear}

            <strong>
              {
                certificate.certificate
                  .academicYear.name
              }
            </strong>
          </div>

          <div>
            {t.class}

            <strong>
              {certificate.class.name}
            </strong>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ================================================================
   SMALL COMPONENTS
================================================================ */

function CertificateInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="certificate-info">
      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

function ResultBox({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: "complete" | "incomplete";
}) {
  return (
    <div className="result-box">
      <span>{label}</span>

      <strong
        className={
          status === "complete"
            ? "result-complete"
            : status === "incomplete"
              ? "result-incomplete"
              : ""
        }
      >
        {value}
      </strong>
    </div>
  );
}

function Signature({
  title,
  name,
}: {
  title: string;
  name: string | null;
}) {
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

/* ================================================================
   TRANSLATIONS
================================================================ */

type CertificateTranslations = ReturnType<
  typeof getTranslations
>;

function getTranslations(
  locale: "en" | "ar" | "fr",
) {
  const common = {
    en: {
      academicDocument: "Academic Document",
      certificatePreview: "Certificate Preview",
      flipCertificate: "Flip Certificate",
      showFront: "Show Front",
      printPdf: "Print / PDF",
      mobileFlipHint:
        "Tap the certificate or use the button to flip",
      academicYear: "Academic Year",
      result: "Result",
      percentage: "Percentage",
      academicCertificate: "Academic Certificate",
      student: "Student",
      class: "Class",
      grade: "Grade",
      issueDate: "Issue Date",
      subject: "Subject",
      score: "Score",
      maximum: "Maximum",
      noSubjectResults:
        "No subject results available",
      total: "Total",
      headOfClass: "Head of Class",
      officialAcademicRecord:
        "Official Academic Record",
      principal: "Principal",
      academicRecord: "Academic Record",
      academicPerformance:
        "Academic Performance",
      overallScore: "Overall Score",
      status: "Status",
      issued: "Issued",
      complete: "Complete",
      incomplete: "Incomplete",
    },

    ar: {
      academicDocument: "وثيقة أكاديمية",
      certificatePreview: "معاينة الشهادة",
      flipCertificate: "قلب الشهادة",
      showFront: "عرض الواجهة",
      printPdf: "طباعة / PDF",
      mobileFlipHint:
        "اضغط على الشهادة أو الزر لقلبها",
      academicYear: "العام الدراسي",
      result: "النتيجة",
      percentage: "النسبة المئوية",
      academicCertificate: "الشهادة الأكاديمية",
      student: "الطالب",
      class: "الفصل",
      grade: "الصف",
      issueDate: "تاريخ الإصدار",
      subject: "المادة",
      score: "الدرجة",
      maximum: "الدرجة القصوى",
      noSubjectResults:
        "لا توجد نتائج للمواد",
      total: "الإجمالي",
      headOfClass: "رئيس الفصل",
      officialAcademicRecord:
        "سجل أكاديمي رسمي",
      principal: "مدير المدرسة",
      academicRecord: "السجل الأكاديمي",
      academicPerformance:
        "الأداء الأكاديمي",
      overallScore: "النتيجة الإجمالية",
      status: "الحالة",
      issued: "صدر في",
      complete: "مكتمل",
      incomplete: "غير مكتمل",
    },

    fr: {
      academicDocument: "Document académique",
      certificatePreview: "Aperçu du certificat",
      flipCertificate: "Retourner le certificat",
      showFront: "Afficher le recto",
      printPdf: "Imprimer / PDF",
      mobileFlipHint:
        "Touchez le certificat ou le bouton pour le retourner",
      academicYear: "Année scolaire",
      result: "Résultat",
      percentage: "Pourcentage",
      academicCertificate:
        "Certificat académique",
      student: "Élève",
      class: "Classe",
      grade: "Niveau",
      issueDate: "Date d'émission",
      subject: "Matière",
      score: "Note",
      maximum: "Maximum",
      noSubjectResults:
        "Aucun résultat de matière disponible",
      total: "Total",
      headOfClass: "Responsable de classe",
      officialAcademicRecord:
        "Dossier académique officiel",
      principal: "Directeur",
      academicRecord: "Dossier académique",
      academicPerformance:
        "Performance académique",
      overallScore: "Score global",
      status: "Statut",
      issued: "Émis le",
      complete: "Complet",
      incomplete: "Incomplet",
    },
  };

  return common[locale];
}

function getResultStatus(
  status: "complete" | "incomplete",
  locale: "en" | "ar" | "fr",
) {
  if (locale === "ar") {
    return status === "complete"
      ? "مكتمل"
      : "غير مكتمل";
  }

  if (locale === "fr") {
    return status === "complete"
      ? "Complet"
      : "Incomplet";
  }

  return status === "complete"
    ? "Complete"
    : "Incomplete";
}

