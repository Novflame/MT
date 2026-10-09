
"use client";

import Image from "next/image";
import { useState } from "react";

import { useLanguage } from "@/components/providers/LanguageProvider";

import systemLogo from "@/logo/logo.png";

import "./CertificateClient.css";

export type CertificateData = {
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

  function toggleFlip() {
    setFlipped((value) => !value);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <main
      className="certificate-page"
      dir={direction}
    >
      {/* =====================================================
          TOOLBAR
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
              onClick={toggleFlip}
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
        <div className="certificate-flip-container">
          <div
            className={[
              "certificate-flip",
              flipped ? "is-back" : "",
            ].join(" ")}
          >
            {/* FRONT */}

            <div className="certificate-flip-face">
              <CertificateFront
                certificate={certificate}
                t={t}
                locale={locale}
              />
            </div>

            {/* BACK */}

            <div className="certificate-flip-face back">
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
          MOBILE CERTIFICATE
      ===================================================== */}

      <section className="mobile-certificate-area">
        <div className="mobile-hint">
          {t.mobileFlipHint}
        </div>

        <div
          className="certificate-flip-container"
          onClick={toggleFlip}
          role="button"
          tabIndex={0}
          aria-label={
            flipped
              ? t.showFront
              : t.flipCertificate
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter" ||
              event.key === " "
            ) {
              event.preventDefault();
              toggleFlip();
            }
          }}
        >
          <div
            className={[
              "certificate-flip",
              flipped ? "is-back" : "",
            ].join(" ")}
          >
            {/* FRONT */}

            <div className="certificate-flip-face">
              <CertificateFront
                certificate={certificate}
                t={t}
                locale={locale}
              />
            </div>

            {/* BACK */}

            <div className="certificate-flip-face back">
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
    <article
      id="certificate"
      className="certificate-paper"
    >
      <div className="certificate-border-outer" />
      <div className="certificate-border-inner" />

      {/* =====================================================
          SYSTEM WATERMARK
          Independent from school logo
      ===================================================== */}

      <div className="certificate-watermark">
        <div className="certificate-watermark-inner">
          <Image
            src={systemLogo}
            alt=""
            width={260}
            height={260}
            priority
          />
        </div>
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
            <div className="certificate-school-name">
              {certificate.school.name}
            </div>

            <h2 className="certificate-title">
              {t.academicCertificate}
            </h2>

            <p className="certificate-school-tagline">
              {t.schoolTagline}
            </p>
          </div>
        </header>

        {/* =================================================
            STUDENT
        ================================================= */}

        <section className="certificate-student-section">
          <div className="certificate-label">
            {t.certifyThat}
          </div>

          <div className="certificate-student-name">
            {certificate.student.name}
          </div>

          <p className="certificate-award-statement">
            {t.awardStatement(
              certificate.class.gradeLevel,
              certificate.school.name,
              certificate.certificate.academicYear.name,
            )}
          </p>

          <div className="certificate-class-row">
            <div className="certificate-class-item">
              <span className="certificate-label">
                {t.class}
              </span>

              <strong className="certificate-class-value">
                {certificate.class.name}
              </strong>
            </div>

            <div className="certificate-class-item">
              <span className="certificate-label">
                {t.grade}
              </span>

              <strong className="certificate-class-value">
                {certificate.class.gradeLevel}
              </strong>
            </div>
          </div>
        </section>

        {/* =================================================
            META
        ================================================= */}

        <div className="certificate-meta">
          <div className="certificate-meta-item">
            <span className="certificate-label">
              {t.issueDate}
            </span>

            <strong className="certificate-meta-value">
              {formatDate(
                certificate.certificate.issueDate,
                locale,
              )}
            </strong>
          </div>

          <div className="certificate-meta-item">
            <span className="certificate-label">
              {t.academicYear}
            </span>

            <strong className="certificate-meta-value">
              {
                certificate.certificate.academicYear
                  .name
              }
            </strong>
          </div>
        </div>

        {/* =================================================
            SUBJECT RESULTS
        ================================================= */}

        <section className="certificate-subjects">
          <h3 className="certificate-section-title">
            {t.academicPerformance}
          </h3>

          <div className="certificate-table-wrapper">
            <table className="certificate-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t.subject}</th>
                  <th>{t.score}</th>
                  <th>{t.maximum}</th>
                  <th>{t.percentage}</th>
                </tr>
              </thead>

              <tbody>
                {certificate.result.subjects.map(
                  (subject, index) => (
                    <tr key={subject.examId}>
                      <td>{index + 1}</td>

                      <td>
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
                    <td colSpan={5}>
                      {t.noSubjectResults}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* =================================================
            RESULT SUMMARY
        ================================================= */}

        <section className="certificate-result-summary">
          <div className="certificate-result-card">
            <span>{t.total}</span>

            <strong>
              {certificate.result.totalScore}
              {" / "}
              {certificate.result.totalMaxScore}
            </strong>
          </div>

          <div className="certificate-result-card">
            <span>{t.percentage}</span>

            <strong>
              {certificate.result.percentage}%
            </strong>
          </div>

          <div className="certificate-result-card">
            <span>{t.result}</span>

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
        </section>

        {/* =================================================
            NOTES
        ================================================= */}

        {certificate.notes && (
          <div className="certificate-notes">
            <span>{certificate.notes}</span>
          </div>
        )}

        {/* =================================================
            SIGNATURES
        ================================================= */}

        <section className="certificate-signatures">
          <Signature
            title={t.headOfClass}
            name={
              certificate.signatures.headOfClass
                .name
            }
          />

          <Signature
            title={t.principal}
            name={
              certificate.signatures.principal.name
            }
          />
        </section>

        <footer className="certificate-footer">
          <span>
            {t.officialAcademicRecord}
          </span>
        </footer>
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
    <article className="certificate-paper">
      <div className="certificate-border-outer" />
      <div className="certificate-border-inner" />

      <div className="certificate-back">
        <div className="certificate-back-content">
          {/* =================================================
              BACK HEADER
          ================================================= */}

          <header className="certificate-back-header">
            <div className="certificate-logo">
              {certificate.school.logo ? (
                <Image
                  src={certificate.school.logo}
                  alt={certificate.school.name}
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
              <div className="certificate-back-school-name">
                {certificate.school.name}
              </div>

              <h2 className="certificate-back-title">
                {t.academicRecord}
              </h2>

              <p className="certificate-school-tagline">
                {t.schoolTagline}
              </p>
            </div>
          </header>

          <p className="certificate-back-motto">
            {t.backMotto}
          </p>

          {/* =================================================
              STUDENT
          ================================================= */}

          <section className="certificate-back-section">
            <div className="certificate-label">
              {t.student}
            </div>

            <div className="certificate-back-student">
              <strong className="certificate-back-student-name">
                {certificate.student.name}
              </strong>
            </div>
          </section>

          {/* =================================================
              PERFORMANCE
          ================================================= */}

          <section className="certificate-back-section">
            <h3 className="certificate-section-title">
              {t.studentPerformance}
            </h3>

            <div className="certificate-performance">
              {certificate.result.subjects.map(
                (subject) => (
                  <div
                    key={subject.examId}
                    className="certificate-performance-item"
                  >
                    <span className="certificate-performance-label">
                      {subject.subjectName}
                    </span>

                    <div className="certificate-performance-track">
                      <div
                        className="certificate-performance-bar"
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

                    <strong className="certificate-performance-value">
                      {subject.percentage}%
                    </strong>
                  </div>
                ),
              )}

              {certificate.result.subjects.length ===
                0 && (
                <p>
                  {t.noSubjectResults}
                </p>
              )}
            </div>
          </section>

          {/* =================================================
              OVERALL RESULT
          ================================================= */}

          <section className="certificate-back-result">
            <h3 className="certificate-back-result-heading">
              {t.overallScore}
            </h3>

            <div className="certificate-back-result-card">
              <span className="certificate-back-result-label">
                {t.overallScore}
              </span>

              <strong className="certificate-back-result-value">
                {certificate.result.totalScore}
                {" / "}
                {certificate.result.totalMaxScore}
              </strong>
            </div>

            <div className="certificate-back-result-card">
              <span className="certificate-back-result-label">
                {t.percentage}
              </span>

              <strong className="certificate-back-result-value">
                {certificate.result.percentage}%
              </strong>
            </div>

            <div className="certificate-back-result-card">
              <span className="certificate-back-result-label">
                {t.status}
              </span>

              <strong
                className={[
                  "certificate-back-result-value",
                  certificate.result.status ===
                  "complete"
                    ? "result-complete"
                    : "result-incomplete",
                ].join(" ")}
              >
                {getResultStatus(
                  certificate.result.status,
                  locale,
                )}
              </strong>
            </div>
          </section>

          <p className="certificate-back-quote">
            {t.backQuote}
          </p>

          {/* =================================================
              BACK FOOTER
          ================================================= */}

          <footer className="certificate-back-footer">
            <p className="certificate-back-wish">
              {t.backWish}
            </p>

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
          </footer>
        </div>
      </div>
    </article>
  );
}

/* ================================================================
   SMALL COMPONENTS
================================================================ */

function Signature({
  title,
  name,
}: {
  title: string;
  name: string | null;
}) {
  return (
    <div className="certificate-signature">
      <div className="certificate-signature-line" />

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
      academicCertificate:
        "Academic Certificate",
      certifyThat: "This is to certify that",
      awardStatement: (
        grade: number,
        school: string,
        year: string,
      ) =>
        `has successfully completed the academic requirements for Grade ${grade} at ${school} for the academic year ${year}.`,
      student: "Student",
      class: "Class",
      grade: "Grade",
      issueDate: "Issue Date",
      subject: "Subject",
      score: "Score",
      maximum: "Maximum Score",
      noSubjectResults:
        "No subject results available",
      total: "Total",
      headOfClass: "Class Teacher",
      schoolTagline: "Learn · Grow · Build Tomorrow",
      officialAcademicRecord:
        "Official Academic Record",
      principal: "Principal",
      academicRecord: "Academic Record",
      backMotto: "Knowledge Today... A Brighter Tomorrow",
      backQuote:
        "Your hard work today builds your success tomorrow.",
      backWish:
        "We are proud of your achievements and wish you continued success.",
      academicPerformance:
        "Academic Performance",
      studentPerformance: "Student Performance",
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
      academicCertificate:
        "الشهادة الأكاديمية",
      schoolTagline: "تعلّم · انمُ · ابنِ غدًا",
      certifyThat: "تشهد هذه الشهادة بأن",
      awardStatement: (
        grade: number,
        school: string,
        year: string,
      ) =>
        `أكمل بنجاح المتطلبات الأكاديمية للصف ${grade} في ${school} للعام الدراسي ${year}.`,
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
      backMotto: "المعرفة اليوم... غدٌ أكثر إشراقًا",
      backQuote:
        "عملك الجاد اليوم يبني نجاحك غدًا.",
      backWish:
        "نحن فخورون بإنجازاتك ونتمنى لك دوام النجاح.",
      academicPerformance:
        "الأداء الأكاديمي",
      studentPerformance: "أداء الطالب",
      overallScore: "النتيجة الإجمالية",
      status: "الحالة",
      issued: "صدر في",
      complete: "مكتمل",
      incomplete: "غير مكتمل",
    },

    fr: {
      academicDocument: "Document académique",
      certificatePreview: "Aperçu du certificat",
      flipCertificate:
        "Retourner le certificat",
      showFront: "Afficher le recto",
      printPdf: "Imprimer / PDF",
      mobileFlipHint:
        "Touchez le certificat ou le bouton pour le retourner",
      academicYear: "Année scolaire",
      result: "Résultat",
      percentage: "Pourcentage",
      academicCertificate:
        "Certificat académique",
      schoolTagline: "Apprendre · Grandir · Construire demain",
      certifyThat: "Nous certifions que",
      awardStatement: (
        grade: number,
        school: string,
        year: string,
      ) =>
        `a terminé avec succès les exigences académiques du niveau ${grade} à ${school} pour l'année scolaire ${year}.`,
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
      headOfClass:
        "Responsable de classe",
      officialAcademicRecord:
        "Dossier académique officiel",
      principal: "Directeur",
      academicRecord: "Dossier académique",
      backMotto: "Le savoir aujourd'hui... un avenir plus lumineux",
      backQuote:
        "Votre travail d'aujourd'hui construit votre réussite de demain.",
      backWish:
        "Nous sommes fiers de vos réussites et vous souhaitons beaucoup de succès.",
      academicPerformance:
        "Performance académique",
      studentPerformance: "Résultats de l'élève",
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
export function CertificatePrintablePage({
  certificate,
  locale,
}: {
  certificate: CertificateData;
  locale: "ar" | "en" | "fr";
}) {
  const t = getTranslations(locale);

  return (
    <main
      className="certificate-page certificate-batch-page"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <section className="certificate-stage desktop-certificate">
        <div className="certificate-flip-container">
          <div className="certificate-flip">
            <div className="certificate-flip-face">
              <CertificateFront
                certificate={certificate}
                t={t}
                locale={locale}
              />
            </div>

            <div className="certificate-flip-face back">
              <CertificateBack
                certificate={certificate}
                t={t}
                locale={locale}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

   