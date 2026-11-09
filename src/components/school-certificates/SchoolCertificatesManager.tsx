"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import CertificateTemplatePreview from "./CertificateTemplatePreview";
import certificateStyles from "./certificate-templates.module.css";

type CertificateType =
  | "FINAL_YEAR"
  | "MID_TERM"
  | "SCHOOL_COMPLETION"
  | "APPRECIATION_ACHIEVEMENT";

type Language = "ar" | "en" | "fr";

type AcademicYear = {
  id: string;
  name: string;
  isActive: boolean;
};

type SchoolClass = {
  id: string;
  name: string;
  gradeLevel: number;
};

type CertificateStudent = {
  enrollmentId: string;
  studentId: string;
  admissionNumber: string;
  fullName: string;
  class: {
    id: string;
    name: string;
    gradeLevel: number;
  };
  alreadyIssued: boolean;
  certificateId: string | null;
  issuedAt: string | null;
};

type CertificateRecord = {
  id: string;
  enrollmentId: string;
  academicYearId: string;
  certificateType: CertificateType;
  issuedAt: string;
  issuedByUserId: string;
  notes: string | null;
  language?: Language;
  student: {
    id: string;
    admissionNumber: string;
    fullName: string;
  };
  class: {
    id: string;
    name: string;
    gradeLevel: number;
  };
};

type Props = {
  academicYears: AcademicYear[];
  classes: SchoolClass[];
};

type ApiResult = {
  error?: string;
  message?: string;
  academicYear?: AcademicYear;
  certificateType?: CertificateType;
  students?: CertificateStudent[];
  eligibleCount?: number;
  history?: CertificateRecord[];
  issuedCount?: number;
  skippedCount?: number;
  issued?: { enrollmentId: string }[];
};

type Filters = {
  academicYearId: string;
  certificateType: CertificateType;
  classId: string;
  language: Language;
};

const CERTIFICATE_OPTIONS: {
  value: CertificateType;
  label: Record<Language, string>;
  description: Record<Language, string>;
  colors: {
    active: string;
    icon: string;
    badge: string;
  };
}[] = [
  {
    value: "FINAL_YEAR",
    label: {
      ar: "شهادة نهاية العام",
      en: "Final Year Certificate",
      fr: "Certificat de fin d'année",
    },
    description: {
      ar: "شهادة نهاية العام الحالية. يجب الحفاظ على تصميمها وحساب نتائجها دون تغيير.",
      en: "The existing final-year certificate. Its design and result calculations must remain unchanged.",
      fr: "Certificat de fin d'année existant. Son design et ses calculs doivent rester inchangés.",
    },
    colors: {
      active: "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40",
      icon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
      badge:
        "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
    },
  },
  {
    value: "MID_TERM",
    label: {
      ar: "شهادة منتصف العام",
      en: "Mid-Term Certificate",
      fr: "Certificat de mi-année",
    },
    description: {
      ar: "شهادة مستقلة لنتائج منتصف العام، بألوان مميزة وباستخدام قالب الشهادة الأساسي.",
      en: "A separate mid-term certificate with its own colors and the shared certificate layout.",
      fr: "Un certificat de mi-année distinct, avec ses propres couleurs et le modèle commun.",
    },
    colors: {
      active: "border-sky-500 bg-sky-50 dark:bg-sky-950/40",
      icon: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
      badge: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    },
  },
  {
    value: "SCHOOL_COMPLETION",
    label: {
      ar: "شهادة إتمام الدراسة",
      en: "School Completion Certificate",
      fr: "Certificat de fin d'études",
    },
    description: {
      ar: "شهادة إتمام الدراسة المدرسية، وليست شهادة التخرج الحكومية. تصميم أخضر داكن وذهبي.",
      en: "School completion certificate, not a government-issued graduation certificate. Dark green and gold design.",
      fr: "Certificat de fin d'études scolaires, et non diplôme officiel délivré par l'État. Design vert foncé et or.",
    },
    colors: {
      active: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
      icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      badge:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    },
  },
  {
    value: "APPRECIATION_ACHIEVEMENT",
    label: {
      ar: "شهادة التقدير والإنجاز",
      en: "Appreciation & Achievement Certificate",
      fr: "Certificat de mérite et de réussite",
    },
    description: {
      ar: "شهادة تقدير وإنجاز بتصميم بنفسجي وذهبي، مع تحديد سبب المنح.",
      en: "A purple and gold appreciation certificate with a required reason for issuance.",
      fr: "Un certificat de mérite violet et or, avec un motif d'attribution obligatoire.",
    },
    colors: {
      active: "border-purple-500 bg-purple-50 dark:bg-purple-950/40",
      icon: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
      badge:
        "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
    },
  },
];

const TEXT: Record<Language, Record<string, string>> = {
  ar: {
    title: "إدارة الشهادات المدرسية",
    subtitle: "إصدار الشهادات حسب السنة الأكاديمية والصف ومراجعة السجل الرسمي.",
    authorized: "إدارة مخوّلة",
    year: "السنة الدراسية",
    certificate: "نوع الشهادة",
    class: "الصف الدراسي",
    allClasses: "جميع الصفوف",
    language: "لغة الشهادة",
    arabic: "العربية",
    english: "الإنجليزية",
    french: "الفرنسية",
    students: "الطلاب في القائمة",
    issued: "شهادات صادرة مسبقًا",
    selected: "الطلاب المحددون للإصدار",
    issueTab: "إصدار الشهادات",
    historyTab: "سجل الشهادات",
    issueTitle: "طلاب الصف المحدد",
    issueDescription:
      "تُحمّل القائمة تلقائيًا عند تغيير اختياراتك. أزل التحديد عن أي طالب لا تريد إصدار شهادة له.",
    search: "ابحث بالاسم أو رقم القيد",
    selectVisible: "تحديد الظاهر",
    deselectVisible: "إلغاء تحديد الظاهر",
    student: "الطالب",
    admission: "رقم القيد",
    status: "حالة الشهادة",
    issuedStatus: "صدرت مسبقًا",
    available: "متاح للإصدار",
    excluded: "مستبعد من الإصدار",
    reason: "سبب منح الشهادة",
    reasonPlaceholder: "اكتب سبب الاستحقاق أو الإنجاز...",
    reasonRequired: "سبب المنح مطلوب لشهادة التقدير والإنجاز.",
    reasonHint: "سيُحفظ السبب مع سجل الشهادة.",
    issueButton: "استخراج الشهادات",
    issuing: "جارٍ إعداد الشهادات...",
    historyTitle: "سجل الشهادات الصادرة",
    historyDescription: "السجلات المحفوظة للسنة ونوع الشهادة والصف المحددين.",
    date: "تاريخ الإصدار",
    notes: "الملاحظات",
    records: "عدد السجلات",
    noYears: "لا توجد سنوات دراسية في قاعدة البيانات.",
    noStudents: "لا يوجد طلاب مطابقون للاختيارات الحالية.",
    loading: "جارٍ تحميل الطلاب...",
    loadingHistory: "جارٍ تحميل السجل...",
    loadError: "تعذر تحميل قائمة الطلاب.",
    historyError: "تعذر تحميل سجل الشهادات.",
    issueError: "تعذر إصدار الشهادات.",
    yearRequired: "يرجى اختيار السنة الدراسية.",
    studentRequired: "حدد طالبًا واحدًا على الأقل للإصدار.",
    confirm: "هل تريد إصدار الشهادات للطلاب المحددين؟",
    success: "اكتملت عملية إصدار الشهادات.",
    issuedCount: "الصادر",
    skippedCount: "المتجاوز",
    confirmTitle: "تأكيد إصدار الشهادات",
    cancel: "إلغاء",
    confirmIssue: "تأكيد الإصدار",
    noHistory: "لا توجد سجلات للشهادة المحددة.",
    choose: "اختر السنة والصف ونوع الشهادة لعرض الطلاب.",
    finalYearNote:
      "يجب أن يستخدم نوع نهاية العام مسار الشهادة الحالي وحساباته وتصميمه دون تعديل.",
    alreadyIssuedWarning:
      "الطلاب الذين صدرت لهم الشهادة نفسها في السنة المحددة لا يمكن اختيارهم مرة أخرى.",
    allLoaded: "تم تحميل القائمة بنجاح.",
    classColumn: "الصف",
    noNotes: "—",
    close: "إغلاق",
    progress: "تقدم الإعداد",
    processed: "تمت معالجة",
    failed: "فشل",
    allPrepared: "تم إعداد جميع الشهادات بنجاح. ✅",
    partialPrepared: "تم إعداد {success} شهادة بنجاح، وفشل إعداد {failed} شهادة.",
    historySummary: "ملخص السجل للسنة المحددة",
    noHistorySummary: "لا توجد شهادات مستخرجة لهذه السنة.",
    exportReady: "تصدير الشهادات الناجحة إلى PDF",
    openPreview: "فتح المعاينة الكاملة",
    previewReady: "معاينة الشهادة الكاملة وتصديرها إلى PDF عند الحاجة.",
    finalYearPreviewHint:
      "تظل معاينة شهادة نهاية العام ضمن مسار الطباعة الحالي.",
    languageNote:
      "تُرسل اللغة المختارة إلى الخادم ليستخدمها قالب الشهادة عند العرض والطباعة.",
    excludedCount: "غير المحددين",
    validationTitle: "يرجى مراجعة البيانات",
    successTitle: "تمت العملية بنجاح",
    alreadyIssuedClick:
      "لا يمكن إصدار هذه الشهادة مرة أخرى لهذا الطالب في السنة الدراسية المحددة.",
    noSelectableStudents:
      "لا يوجد طلاب متاحون للإصدار ضمن القائمة الحالية. تحقق من حالة الشهادات أو غيّر اختياراتك.",
    loadingStudents: "انتظر حتى يكتمل تحميل قائمة الطلاب.",
  },
  en: {
    title: "School Certificates",
    subtitle:
      "Issue certificates by academic year and class, and review the official history.",
    authorized: "Authorized administration",
    year: "Academic year",
    certificate: "Certificate type",
    class: "Class",
    allClasses: "All classes",
    language: "Certificate language",
    arabic: "Arabic",
    english: "English",
    french: "French",
    students: "Students in list",
    issued: "Previously issued",
    selected: "Students selected",
    issueTab: "Issue certificates",
    historyTab: "Certificate history",
    issueTitle: "Students in the selected class",
    issueDescription:
      "The list loads automatically when your selections change. Deselect any student you do not want to include.",
    search: "Search by name or admission number",
    selectVisible: "Select visible",
    deselectVisible: "Deselect visible",
    student: "Student",
    admission: "Admission number",
    status: "Certificate status",
    issuedStatus: "Already issued",
    available: "Available",
    excluded: "Excluded from issuance",
    reason: "Reason for award",
    reasonPlaceholder: "Enter the reason for recognition or achievement...",
    reasonRequired: "A reason is required for appreciation certificates.",
    reasonHint: "The reason will be saved with the certificate record.",
    issueButton: "Issue certificates",
    issuing: "Issuing certificates...",
    historyTitle: "Issued certificate history",
    historyDescription: "Saved records for the selected year, type, and class.",
    date: "Issue date",
    notes: "Notes",
    records: "Records",
    noYears: "No academic years were found.",
    noStudents: "No students match the current selections.",
    loading: "Loading students...",
    loadingHistory: "Loading history...",
    loadError: "Unable to load students.",
    historyError: "Unable to load certificate history.",
    issueError: "Unable to issue certificates.",
    yearRequired: "Select an academic year.",
    studentRequired: "Select at least one student.",
    confirm: "Issue certificates for the selected students?",
    success: "Certificate issuance completed.",
    issuedCount: "Issued",
    skippedCount: "Skipped",
    confirmTitle: "Confirm certificate issuance",
    cancel: "Cancel",
    confirmIssue: "Confirm issuance",
    noHistory: "No records found for this certificate type.",
    choose:
      "Choose the academic year, class, and certificate type to load students.",
    finalYearNote:
      "Final-year certificates must retain their existing route, calculations, and design unchanged.",
    alreadyIssuedWarning:
      "Students who already have this certificate for the selected year cannot be selected again.",
    allLoaded: "Student list loaded successfully.",
    classColumn: "Class",
    noNotes: "—",
    close: "Close",
    progress: "Preparation progress",
    processed: "Processed",
    failed: "Failed",
    allPrepared: "All certificates were prepared successfully. ✅",
    partialPrepared: "Successfully prepared {success} certificates; {failed} failed.",
    historySummary: "History summary for selected year",
    noHistorySummary: "No certificates have been issued for this year.",
    exportReady: "Export successful certificates to PDF",
    openPreview: "Open full preview",
    previewReady: "Open the full certificate preview or export it to PDF.",
    finalYearPreviewHint:
      "Final-year certificates remain in their existing print flow.",
    languageNote:
      "The selected language is sent to the server for certificate rendering and printing.",
    excludedCount: "Not selected",
    validationTitle: "Please review the information",
    successTitle: "Operation completed successfully",
    alreadyIssuedClick:
      "This certificate has already been issued to this student for the selected academic year.",
    noSelectableStudents:
      "No students are available for issuance in the current list. Check certificate statuses or change your filters.",
    loadingStudents: "Please wait until the student list finishes loading.",
  },
  fr: {
    title: "Gestion des certificats scolaires",
    subtitle:
      "Émission par année scolaire et classe, avec consultation de l'historique officiel.",
    authorized: "Administration autorisée",
    year: "Année scolaire",
    certificate: "Type de certificat",
    class: "Classe",
    allClasses: "Toutes les classes",
    language: "Langue du certificat",
    arabic: "Arabe",
    english: "Anglais",
    french: "Français",
    students: "Élèves dans la liste",
    issued: "Déjà délivrés",
    selected: "Élèves sélectionnés",
    issueTab: "Émettre les certificats",
    historyTab: "Historique",
    issueTitle: "Élèves de la classe sélectionnée",
    issueDescription:
      "La liste se charge automatiquement lorsque les choix changent. Désélectionnez tout élève à exclure.",
    search: "Rechercher par nom ou numéro d'inscription",
    selectVisible: "Sélectionner les visibles",
    deselectVisible: "Désélectionner les visibles",
    student: "Élève",
    admission: "Numéro d'inscription",
    status: "Statut du certificat",
    issuedStatus: "Déjà délivré",
    available: "Disponible",
    excluded: "Exclu de l'émission",
    reason: "Motif de distinction",
    reasonPlaceholder:
      "Saisissez le motif de la distinction ou de la réussite...",
    reasonRequired: "Le motif est obligatoire pour les certificats de mérite.",
    reasonHint: "Le motif sera enregistré avec le certificat.",
    issueButton: "Émettre les certificats",
    issuing: "Émission en cours...",
    historyTitle: "Historique des certificats délivrés",
    historyDescription:
      "Registres de l'année, du type et de la classe sélectionnés.",
    date: "Date d'émission",
    notes: "Remarques",
    records: "Nombre d'enregistrements",
    noYears: "Aucune année scolaire trouvée.",
    noStudents: "Aucun élève ne correspond aux choix actuels.",
    loading: "Chargement des élèves...",
    loadingHistory: "Chargement de l'historique...",
    loadError: "Impossible de charger les élèves.",
    historyError: "Impossible de charger l'historique.",
    issueError: "Impossible d'émettre les certificats.",
    yearRequired: "Sélectionnez une année scolaire.",
    studentRequired: "Sélectionnez au moins un élève.",
    confirm: "Émettre les certificats pour les élèves sélectionnés ?",
    success: "L'émission des certificats est terminée.",
    issuedCount: "Délivrés",
    skippedCount: "Ignorés",
    confirmTitle: "Confirmer l'émission",
    cancel: "Annuler",
    confirmIssue: "Confirmer",
    noHistory: "Aucun enregistrement pour ce type de certificat.",
    choose:
      "Choisissez l'année, la classe et le type de certificat pour charger les élèves.",
    finalYearNote:
      "Le certificat de fin d'année doit conserver sa route, ses calculs et son design existants.",
    alreadyIssuedWarning:
      "Un certificat déjà délivré pour cette année ne peut pas être délivré une seconde fois.",
    allLoaded: "La liste des élèves a été chargée.",
    classColumn: "Classe",
    noNotes: "—",
    close: "Fermer",
    progress: "Progression de la préparation",
    processed: "Traités",
    failed: "Échecs",
    allPrepared: "Tous les certificats ont été préparés avec succès. ✅",
    partialPrepared: "{success} certificats préparés avec succès ; {failed} échecs.",
    historySummary: "Résumé de l’historique pour l’année sélectionnée",
    noHistorySummary: "Aucun certificat n’a été délivré pour cette année.",
    exportReady: "Exporter les certificats réussis en PDF",
    openPreview: "Ouvrir l’aperçu complet",
    previewReady: "Ouvrez l’aperçu complet ou exportez le certificat en PDF.",
    finalYearPreviewHint:
      "Les certificats de fin d’année restent dans leur parcours d’impression actuel.",
    languageNote:
      "La langue choisie est envoyée au serveur pour l'affichage et l'impression.",
    excludedCount: "Non sélectionnés",
    validationTitle: "Veuillez vérifier les informations",
    successTitle: "Opération terminée avec succès",
    alreadyIssuedClick:
      "Ce certificat a déjà été délivré à cet élève pour l'année scolaire sélectionnée.",
    noSelectableStudents:
      "Aucun élève n'est disponible pour l'émission. Vérifiez les statuts ou modifiez les filtres.",
    loadingStudents: "Veuillez attendre le chargement de la liste des élèves.",
  },
};

function formatDate(value: string | null | undefined, language: Language) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  const locale =
    language === "ar" ? "ar" : language === "fr" ? "fr-FR" : "en-US";

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getCertificateOption(type: CertificateType) {
  return CERTIFICATE_OPTIONS.find((option) => option.value === type)!;
}
function CertificateShowcase({
  language,
  selectedType,
  sampleStudent,
  onSelect,
}: {
  language: Language;
  selectedType: CertificateType;
  sampleStudent: {
    fullName: string;
    className: string;
    academicYear: string;
    schoolName: string;
    schoolSubtitle?: string;
    issueDate?: string;
    sectionName?: string;
    principalName?: string;
    departmentHeadName?: string;
  };
  onSelect: (type: CertificateType) => void;
}) {
  const [direction, setDirection] = useState(1);
  const selectedOption = getCertificateOption(selectedType);
  const [displayedType, setDisplayedType] = useState(selectedType);
  const displayedOption = getCertificateOption(displayedType);
  const selectedIndex = CERTIFICATE_OPTIONS.findIndex(
    (option) => option.value === selectedType,
  );
  const [exitingType, setExitingType] = useState<CertificateType | null>(null);
  const displayedIndex = CERTIFICATE_OPTIONS.findIndex(
    (option) => option.value === displayedType,
  );
  const labels = {
    ar: { approved: "معتمدة", previous: "السابق", next: "التالي" },
    en: { approved: "Approved", previous: "Previous", next: "Next" },
    fr: { approved: "Approuvé", previous: "Précédent", next: "Suivant" },
  }[language];
  const PreviousIcon = language === "ar" ? ChevronRight : ChevronLeft;
  const NextIcon = language === "ar" ? ChevronLeft : ChevronRight;

  function selectType(type: CertificateType, travelDirection?: number) {
    const nextIndex = CERTIFICATE_OPTIONS.findIndex(
      (option) => option.value === type,
    );

    if (type !== displayedType) {
      setExitingType(displayedType);
    }

    setDirection(travelDirection ?? (nextIndex > displayedIndex ? 1 : -1));
    setDisplayedType(type);

    if (type !== selectedType) {
      onSelect(type);
    }
  }

  function moveBy(step: number) {
    const nextIndex =
      (selectedIndex + step + CERTIFICATE_OPTIONS.length) %
      CERTIFICATE_OPTIONS.length;
    selectType(CERTIFICATE_OPTIONS[nextIndex].value, step);
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDisplayedType((current) => {
        const currentIndex = CERTIFICATE_OPTIONS.findIndex((option) => option.value === current);
        const next = CERTIFICATE_OPTIONS[(currentIndex + 1) % CERTIFICATE_OPTIONS.length].value;
        setDirection(1);
        setExitingType(current);
        return next;
      });
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!exitingType) {
      return;
    }

    const timer = window.setTimeout(() => setExitingType(null), 650);
    return () => window.clearTimeout(timer);
  }, [exitingType]);

  function renderOption(option: typeof selectedOption) {
    const sampleClass = {
      FINAL_YEAR: certificateStyles["certificate-sample-final-year"],
      MID_TERM: certificateStyles["certificate-sample-mid-term"],
      SCHOOL_COMPLETION: certificateStyles["certificate-sample-completion"],
      APPRECIATION_ACHIEVEMENT:
        certificateStyles["certificate-sample-achievement"],
    }[option.value];

    return (
      <>
        <div
          className={`${certificateStyles["certificate-sample-viewport"]} ${certificateStyles["certificate-card-flip"]} ${sampleClass}`}
          aria-hidden="true"
        >
          {option.value === "FINAL_YEAR" ? (
            <span
              className={`${certificateStyles["certificate-sample"]} ${sampleClass}`}
            >
              <span
                className={certificateStyles["certificate-sample-header"]}
              />
              <span className={certificateStyles["certificate-sample-title"]} />
              <span className={certificateStyles["certificate-sample-name"]} />
              <span
                className={certificateStyles["certificate-sample-details"]}
              />
              <span className={certificateStyles["certificate-sample-footer"]}>
                <span />
                <span />
                <span />
              </span>
            </span>
          ) : (
            <CertificateTemplatePreview
              compact
              student={sampleStudent}
              certificateType={option.value}
              language={language}
              message={
                language === "ar"
                  ? "نموذج معاينة"
                  : language === "fr"
                    ? "Exemple d’aperçu"
                    : "Sample preview"
              }
              onMessageChange={() => {}}
            />
          )}
        </div>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {option.label[language]}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold leading-none ${option.colors.badge}`}
        >
          {labels.approved}
        </span>
      </>
    );
  }

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={
        language === "ar"
          ? `الشهادة المحددة: ${selectedOption.label[language]}، معاينة: ${displayedOption.label[language]}`
          : language === "fr"
            ? `Certificat sélectionné : ${selectedOption.label[language]} ; aperçu : ${displayedOption.label[language]}`
            : `Selected certificate: ${selectedOption.label[language]}; previewing: ${displayedOption.label[language]}`
      }
      className={`flex h-[104px] w-full max-w-xs flex-col justify-between rounded-xl border p-2 shadow-sm transition-colors sm:w-80 sm:shrink-0 ${selectedOption.colors.active}`}
    >
      <div className="relative h-[58px] overflow-hidden">
        {exitingType && exitingType !== displayedType && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 flex items-center gap-2.5 rounded-lg ${
              direction > 0
                ? certificateStyles["certificate-selector-slide-out-forward"]
                : certificateStyles["certificate-selector-slide-out-backward"]
            }`}
          >
            {renderOption(getCertificateOption(exitingType))}
          </div>
        )}

        {/* <button
          type="button"
          aria-label={`${displayedOption.label[language]} — ${labels.approved}`}
          aria-pressed={displayedType === selectedType}
          onClick={() => selectType(displayedType)}
          key={displayedType}
          className={`absolute inset-0 flex w-full items-center gap-2.5 rounded-lg text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${
            direction > 0
              ? certificateStyles["certificate-selector-slide-in-forward"]
              : certificateStyles["certificate-selector-slide-in-backward"]
          }`}
        >
          {renderOption(displayedOption)}
        </button> */}

        <div
          key={displayedType}
          className="absolute inset-0 flex w-full items-center gap-2.5 rounded-lg text-start focus-within:ring-2 focus-within:ring-indigo-500"
        >
          {renderOption(displayedOption)}
        </div>
      </div>

      <div className="flex h-6 items-center justify-between">
        <button
          type="button"
          aria-label={labels.previous}
          onClick={() => moveBy(-1)}
          className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <PreviousIcon size={15} />
        </button>

        <div
          className="flex items-center gap-1.5"
          aria-label={
            language === "ar"
              ? "التنقل بين الشهادات"
              : language === "fr"
                ? "Pagination des certificats"
                : "Certificate pagination"
          }
        >
          {CERTIFICATE_OPTIONS.map((option, index) => {
            const active = option.value === selectedType;
            const previewing = option.value === displayedType;

            return (
              <button
                key={option.value}
                type="button"
                aria-label={option.label[language]}
                aria-pressed={active}
                onClick={() =>
                  selectType(option.value, index > displayedIndex ? 1 : -1)
                }
                className={`h-1.5 rounded-full transition-[width,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  active
                    ? "w-4 bg-indigo-600 dark:bg-indigo-400"
                    : previewing
                      ? "w-3 bg-slate-500 dark:bg-slate-300"
                      : "w-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-400"
                }`}
              />
            );
          })}
        </div>

        <button
          type="button"
          aria-label={labels.next}
          onClick={() => moveBy(1)}
          className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <NextIcon size={15} />
        </button>
      </div>
    </div>
  );
}
export default function SchoolCertificatesManager({
  academicYears,
  classes,
}: Props) {
  const initialYear =
    academicYears.find((year) => year.isActive) ?? academicYears[0];

  const [academicYearId, setAcademicYearId] = useState(initialYear?.id ?? "");
  const [certificateType, setCertificateType] =
    useState<CertificateType>("MID_TERM");
  const [classId, setClassId] = useState("");
  const [language, setLanguage] = useState<Language>("ar");

  const [students, setStudents] = useState<CertificateStudent[]>([]);
  const [history, setHistory] = useState<CertificateRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issueProgress, setIssueProgress] = useState({ processed: 0, successful: 0, failed: 0, total: 0, complete: false });
  const [exportEnrollmentIds, setExportEnrollmentIds] = useState<string[]>([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<"issue" | "history">("issue");
  const [confirming, setConfirming] = useState(false);
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);



  const router = useRouter();
  useEffect(() => {
    if (!isFullPreviewOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsFullPreviewOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isFullPreviewOpen]);

  const t = TEXT[language];
  const isRTL = language === "ar";

  const selectedYear = academicYears.find((year) => year.id === academicYearId);

  const selectedCertificate = getCertificateOption(certificateType);

  const filters: Filters = {
    academicYearId,
    certificateType,
    classId,
    language,
  };

  const visibleStudents = students.filter((student) => {
    const term = search.trim().toLocaleLowerCase();

    return (
      (!classId || student.class.id === classId) &&
      (!term ||
        student.fullName.toLocaleLowerCase().includes(term) ||
        student.admissionNumber.toLocaleLowerCase().includes(term))
    );
  });

  const selectableVisibleStudents = visibleStudents.filter(
    (student) => !student.alreadyIssued,
  );

  const selectedStudents = students.filter(
    (student) =>
      selectedIds.includes(student.enrollmentId) && !student.alreadyIssued,
  );

  const previewStudent = useMemo(() => {
    const firstStudent = selectedStudents[0] ?? students[0];

    if (!firstStudent) {
      return null;
    }

    return {
      fullName: firstStudent.fullName,
      className: firstStudent.class.name,
      academicYear: selectedYear?.name ?? "",
      schoolName: "School",
      schoolSubtitle: "",
      issueDate: new Date().toISOString(),
      sectionName: "",
      principalName: "Principal",
      departmentHeadName: "Head of Department",
    };
  }, [selectedStudents, students, selectedYear]);

  const sampleStudent = useMemo(
    () =>
      previewStudent ?? {
        fullName: "Student Name",
        className: "Class",
        academicYear: selectedYear?.name ?? "",
        schoolName: "School",
        schoolSubtitle: "",
        issueDate: "",
        sectionName: "",
        principalName: "Principal",
        departmentHeadName: "Head of Department",
      },
    [previewStudent, selectedYear],
  );

  const previewMessage =
    certificateType === "APPRECIATION_ACHIEVEMENT"
      ? notes.trim() ||
        (language === "ar"
          ? "ندرك جهود الطالب ونكافئه على التفاني والتميز."
          : language === "fr"
            ? "Nous reconnaissons les efforts et le mérite de l’élève."
            : "We recognize the student’s efforts, commitment, and achievements.")
      : language === "ar"
        ? "نتقدم بالشكر والتقدير إلى هذا الطالب على جهوده الدراسية المستمرة."
        : language === "fr"
          ? "Nous remercions cet élève pour ses efforts et son engagement scolaire continu."
          : "We appreciate this student’s continued effort, dedication, and academic progress.";

  const historySummary = useMemo(() => {
    const groups = new Map<string, { type: CertificateType; className: string; count: number }>();
    for (const record of history) {
      const key = `${record.certificateType}::${record.class.name}`;
      const existing = groups.get(key);
      if (existing) existing.count += 1;
      else groups.set(key, { type: record.certificateType, className: record.class.name, count: 1 });
    }
    return [...groups.values()];
  }, [history]);

  const inputClass =
    "mt-2 block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

  const cardClass =
    "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5";

  async function loadPreview(nextFilters: Filters = filters) {
    if (!nextFilters.academicYearId) {
      setError(t.yearRequired);
      setStudents([]);
      return;
    }

    setLoadingPreview(true);
    setError("");
    setSuccess("");
    setSelectedIds([]);

    try {
      const params = new URLSearchParams({
        mode: "preview",
        academicYearId: nextFilters.academicYearId,
        certificateType: nextFilters.certificateType,
        language: nextFilters.language,
      });

      if (nextFilters.classId) {
        params.set("classId", nextFilters.classId);
      }
      const previewUrl =
        nextFilters.certificateType === "FINAL_YEAR"
          ? `/api/school-certificates/final-year-preview?${params.toString()}`
          : `/api/school-certificates?${params.toString()}`;

      const response = await fetch(previewUrl, {
        method: "GET",
        cache: "no-store",
      });

      const result: ApiResult = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? t.issueError);
      }

      const loadedStudents = result.students ?? [];

      setStudents(loadedStudents);

      setSelectedIds(
        loadedStudents
          .filter((student) => !student.alreadyIssued)
          .map((student) => student.enrollmentId),
      );
    } catch (cause) {
      setStudents([]);
      setError(cause instanceof Error ? cause.message : t.loadError);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function loadHistory(nextFilters: Filters = filters) {
    if (!nextFilters.academicYearId) {
      setError(t.yearRequired);
      return;
    }

    setLoadingHistory(true);
    setError("");
    setSuccess("");

    try {
      const params = new URLSearchParams({
        mode: "history",
        academicYearId: nextFilters.academicYearId,
        language: nextFilters.language,
      });

      const response = await fetch(
        `/api/school-certificates?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const result: ApiResult = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? t.historyError);
      }

      setHistory(result.history ?? []);
    } catch (cause) {
      setHistory([]);
      setError(cause instanceof Error ? cause.message : t.historyError);
    } finally {
      setLoadingHistory(false);
    }
  }

  function updateFilters(next: Partial<Filters>) {
    const nextFilters: Filters = {
      ...filters,
      ...next,
    };

    if (next.academicYearId !== undefined) {
      setAcademicYearId(next.academicYearId);
    }

    if (next.certificateType !== undefined) {
      setCertificateType(next.certificateType);
    }

    if (next.classId !== undefined) {
      setClassId(next.classId);
    }

    if (next.language !== undefined) {
      setLanguage(next.language);
    }

    setStudents([]);
    setHistory([]);
    setSelectedIds([]);
    setSearch("");
    setError("");
    setSuccess("");
    setIssueProgress({ processed: 0, successful: 0, failed: 0, total: 0, complete: false });
    setExportEnrollmentIds([]);
    setConfirming(false);
    setIsFullPreviewOpen(false);

    if (activeTab === "history") {
      void loadHistory(nextFilters);
    } else {
      void loadPreview(nextFilters);
    }
  }

  function toggleStudent(enrollmentId: string) {
    setSelectedIds((current) =>
      current.includes(enrollmentId)
        ? current.filter((id) => id !== enrollmentId)
        : [...current, enrollmentId],
    );
    setError("");
    setSuccess("");
  }

  function toggleVisibleStudents() {
    const visibleIds = selectableVisibleStudents.map(
      (student) => student.enrollmentId,
    );

    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedIds.includes(id));

    setSelectedIds((current) =>
      allSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds])),
    );

    setError("");
    setSuccess("");
  }

  async function exportSelectedCertificates() {
    if (!academicYearId) {
      setError(t.yearRequired);
      return;
    }

    if (!issueProgress.complete || exportEnrollmentIds.length === 0) {
      setError(language === "ar" ? "أكمل إعداد الشهادات أولًا." : language === "fr" ? "Terminez d’abord la préparation des certificats." : "Complete certificate preparation first.");
      return;
    }

    if (certificateType === "APPRECIATION_ACHIEVEMENT" && !notes.trim()) {
      setError(t.reasonRequired);
      return;
    }

    try {
      const response = await fetch("/api/school-certificates/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academicYearId,
          certificateType,
          enrollmentIds: exportEnrollmentIds,
          notes: notes.trim() || undefined,
          language,
          classId: classId || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload.error ??
            (language === "ar"
              ? "تعذر إنشاء ملف PDF للشهادة."
              : language === "fr"
                ? "Le fichier PDF du certificat n’a pas pu être généré."
                : "The certificate PDF could not be generated."),
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${certificateType.toLowerCase()}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.issueError);
    }
  }

  async function issueCertificates() {
    if (!academicYearId) {
      setError(t.yearRequired);
      setConfirming(false);
      return;
    }
    const targets = selectedStudents;
    if (targets.length === 0) {
      setError(t.studentRequired);
      setConfirming(false);
      return;
    }
    if (certificateType === "FINAL_YEAR") {
      // Preserve the existing final-year certificate route and calculations.
      const params = new URLSearchParams({
        academicYearId,
        enrollmentIds: targets.map((student) => student.enrollmentId).join(","),
        language,
      });
      if (classId) params.set("classId", classId);

router.push(`/certificates/batch?${params.toString()}`);
return;
    }
    if (certificateType === "APPRECIATION_ACHIEVEMENT" && !notes.trim()) {
      setError(t.reasonRequired);
      setConfirming(false);
      return;
    }

    setIssuing(true);
    setError("");
    setSuccess("");
    setConfirming(false);
    setExportEnrollmentIds([]);
    setIssueProgress({ processed: 0, successful: 0, failed: 0, total: targets.length, complete: false });

    let processed = 0;
    let successful = 0;
    let failed = 0;
    const succeededIds: string[] = [];

    // Each progress step is based on one completed server request.
    for (const student of targets) {
      try {
        const response = await fetch("/api/school-certificates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            academicYearId,
            certificateType,
            enrollmentIds: [student.enrollmentId],
            notes: notes.trim() || undefined,
            language,
            classId: classId || undefined,
          }),
        });
        const result: ApiResult = await response.json();
        if (!response.ok) throw new Error(result.error ?? t.issueError);

        const issuedRecordReturned = result.issued?.some((record) => record.enrollmentId === student.enrollmentId);
        if ((result.issuedCount ?? 0) > 0 && (issuedRecordReturned || !result.issued)) {
          successful += 1;
          succeededIds.push(student.enrollmentId);
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
      } finally {
        processed += 1;
        setIssueProgress({
          processed,
          successful,
          failed,
          total: targets.length,
          complete: false,
        });
      }
    }

    setExportEnrollmentIds(succeededIds);
    setSelectedIds([]);
    await loadPreview(filters);
    setIssueProgress({ processed: targets.length, successful, failed, total: targets.length, complete: true });
    setSuccess(
      failed === 0 && successful === targets.length
        ? t.allPrepared
        : t.partialPrepared.replace("{success}", String(successful)).replace("{failed}", String(failed)),
    );
    setIssuing(false);
  }

  if (academicYears.length === 0) {
    return (
      <section className={cardClass} dir={isRTL ? "rtl" : "ltr"}>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {t.noYears}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"} lang={language}>
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${selectedCertificate.colors.icon}`}
          >
            <Award size={25} />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t.title}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t.subtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
          <div className="flex items-center gap-2 self-start rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <ShieldCheck size={18} />
            {t.authorized}
          </div>

          <CertificateShowcase
            language={language}
            selectedType={certificateType}
            sampleStudent={sampleStudent}
            onSelect={(type) => updateFilters({ certificateType: type })}
          />
        </div>
      </header>

      <section className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              {selectedCertificate.label[language]}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {certificateType === "FINAL_YEAR"
                ? t.finalYearPreviewHint
                : t.previewReady}
            </p>
          </div>

          {certificateType === "FINAL_YEAR" ? (
            <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              {t.finalYearNote}
            </span>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsFullPreviewOpen(true)}
                disabled={!previewStudent || loadingPreview}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t.openPreview}
              </button>
              {issueProgress.complete && exportEnrollmentIds.length > 0 && (
              <button
                type="button"
                onClick={() => void exportSelectedCertificates()}
                disabled={issuing || loadingPreview}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {language === "ar"
                  ? "تصدير PDF"
                  : language === "fr"
                    ? "Exporter en PDF"
                    : "Export PDF"} ({exportEnrollmentIds.length})
              </button>
              )}
            </div>
          )}
        </div>
      </section>

      {isFullPreviewOpen &&
        certificateType !== "FINAL_YEAR" &&
        previewStudent && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-2 sm:p-6"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setIsFullPreviewOpen(false);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-label={selectedCertificate.label[language]}
              dir={isRTL ? "rtl" : "ltr"}
              lang={language}
              className="max-h-[calc(100dvh-1rem)] w-full max-w-[1240px] overflow-y-auto rounded-2xl bg-white p-3 shadow-2xl dark:bg-slate-900 sm:max-h-[calc(100dvh-3rem)] sm:p-5"
            >
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsFullPreviewOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <XCircle size={17} />
                  {t.close}
                </button>
              </div>
              <CertificateTemplatePreview
                student={previewStudent}
                certificateType={certificateType}
                language={language}
                message={previewMessage}
                onMessageChange={setNotes}
                onPrint={() => void exportSelectedCertificates()}
              />
            </section>
          </div>
        )}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            setActiveTab("issue");
            setError("");
            setSuccess("");
            void loadPreview();
          }}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === "issue"
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
          }`}
        >
          {t.issueTab}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("history");
            setError("");
            setSuccess("");
            void loadHistory();
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === "history"
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
          }`}
        >
          <History size={17} />
          {t.historyTab}
        </button>
      </div>

      {(error || success) && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setError("");
              setSuccess("");
            }
          }}
        >
          <section
            role={error ? "alertdialog" : "dialog"}
            aria-modal="true"
            aria-live={error ? "assertive" : "polite"}
            aria-labelledby="certificate-notification-title"
            className={`w-full max-w-lg rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-8 ${
              error
                ? "border-red-300 dark:border-red-900"
                : "border-emerald-300 dark:border-emerald-900"
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full ${
                  error
                    ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                }`}
              >
                {error ? <XCircle size={36} /> : <CheckCircle2 size={36} />}
              </div>

              <h2
                id="certificate-notification-title"
                className={`mt-5 text-xl font-bold sm:text-2xl ${
                  error
                    ? "text-red-800 dark:text-red-300"
                    : "text-emerald-800 dark:text-emerald-300"
                }`}
              >
                {error ? t.validationTitle : t.successTitle}
              </h2>

              <p className="mt-4 w-full whitespace-pre-wrap break-words text-base leading-7 text-slate-700 dark:text-slate-200">
                {error || success}
              </p>

              <button
                type="button"
                autoFocus
                onClick={() => {
                  setError("");
                  setSuccess("");
                }}
                className={`mt-7 w-full rounded-xl px-5 py-3 font-bold text-white transition focus-visible:outline-none focus-visible:ring-4 ${
                  error
                    ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-200 dark:focus-visible:ring-red-950"
                    : "bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-200 dark:focus-visible:ring-emerald-950"
                }`}
              >
                {t.close}
              </button>
            </div>
          </section>
        </div>
      )}

      {activeTab === "issue" ? (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(250px,0.78fr)_minmax(0,1.7fr)]">
          <div className="space-y-4">
<section className={cardClass}>
        <div className="grid grid-cols-1 gap-3">
          <label className="block text-sm font-semibold">
            {t.certificate}
            <select
              value={certificateType}
              onChange={(event) =>
                updateFilters({
                  certificateType: event.target.value as CertificateType,
                })
              }
              className={inputClass}
            >
              {CERTIFICATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label[language]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold">
            {t.year}
            <select
              value={academicYearId}
              onChange={(event) =>
                updateFilters({ academicYearId: event.target.value })
              }
              className={inputClass}
            >
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                  {year.isActive ? " — ●" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold">
            {t.class}
            <select
              value={classId}
              onChange={(event) =>
                updateFilters({ classId: event.target.value })
              }
              className={inputClass}
            >
              <option value="">{t.allClasses}</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.gradeLevel} — {schoolClass.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold">
            {t.language}
            <select
              value={language}
              onChange={(event) =>
                updateFilters({
                  language: event.target.value as Language,
                })
              }
              className={inputClass}
            >
              <option value="ar">{t.arabic}</option>
              <option value="en">{t.english}</option>
              <option value="fr">{t.french}</option>
            </select>
          </label>
        </div>
      </section>
          {certificateType === "APPRECIATION_ACHIEVEMENT" && (
            <div className="mt-5">
              <label className="block text-sm font-semibold">
                {t.reason}
                <span className="mx-1 text-red-600">*</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder={t.reasonPlaceholder}
                  className={inputClass}
                />
              </label>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t.reasonHint}
              </p>
            </div>
          )}

          </div>
        <section className={cardClass}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">{t.issueTitle}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t.issueDescription}
              </p>
            </div>

            {loadingPreview && (
              <span className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-300">
                <Loader2 className="animate-spin" size={17} />
                {t.loading}
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block w-full sm:max-w-sm">
              <Search
                size={17}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                  isRTL ? "right-3" : "left-3"
                }`}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.search}
                className={`${inputClass} mt-0 ${isRTL ? "pr-9" : "pl-9"}`}
              />
            </label>

            <button
              type="button"
              onClick={toggleVisibleStudents}
              disabled={
                loadingPreview || selectableVisibleStudents.length === 0
              }
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {selectableVisibleStudents.length > 0 &&
              selectableVisibleStudents.every((student) =>
                selectedIds.includes(student.enrollmentId),
              )
                ? t.deselectVisible
                : t.selectVisible}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {t.alreadyIssuedWarning}
          </p>

          {!loadingPreview &&
            students.length > 0 &&
            students.every((student) => student.alreadyIssued) && (
              <div
                role="status"
                className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
              >
                {language === "ar"
                  ? "جميع الطلاب في هذه القائمة حصلوا على هذه الشهادة مسبقًا للسنة الدراسية المحددة. لا يوجد طلاب متاحون لإصدار الشهادة لهم."
                  : language === "fr"
                    ? "Tous les élèves de cette liste ont déjà reçu ce certificat pour l’année scolaire sélectionnée. Aucun élève n’est disponible pour une nouvelle émission."
                    : "All students in this list have already received this certificate for the selected academic year. No students are available for issuance."}
              </div>
            )}

          <div className="mt-5 max-h-[620px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">
                    {t.student}
                  </th>
                  <th className="px-4 py-3 text-start font-semibold">
                    {t.admission}
                  </th>
                  <th className="px-4 py-3 text-start font-semibold">
                    {t.classColumn}
                  </th>
                  <th className="px-4 py-3 text-start font-semibold">
                    {t.status}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleStudents.map((student) => {
                  const selected = selectedIds.includes(student.enrollmentId);

                  return (
                    <tr
                      key={student.enrollmentId}
                      onClick={() => {
                        if (student.alreadyIssued) {
                          setError(t.alreadyIssuedClick);
                          setSuccess("");
                        }
                      }}
                      className={`transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                        student.alreadyIssued
                          ? "cursor-not-allowed"
                          : "cursor-pointer"
                      } ${selected ? "bg-indigo-50/60 dark:bg-indigo-950/20" : ""}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <label className="flex items-center gap-3 font-medium">
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={student.alreadyIssued || loadingPreview}
                            onChange={() => toggleStudent(student.enrollmentId)}
                            aria-label={student.fullName}
                            className="h-4 w-4 shrink-0 rounded border-slate-300 accent-indigo-600 disabled:opacity-40"
                          />
                          <span>{student.fullName}</span>
                        </label>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                        {student.admissionNumber || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {student.class.name}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {student.alreadyIssued ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 size={13} />
                            {t.issuedStatus}
                          </span>
                        ) : selected ? (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {t.available}
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {t.excluded}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!loadingPreview && visibleStudents.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                    >
                      {t.noStudents}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {issueProgress.total > 0 && (
            <section className="mt-5 rounded-xl border border-slate-200 p-3 dark:border-slate-700" aria-live="polite">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <strong>{t.progress}</strong>
                <span>{issueProgress.successful}/{issueProgress.total} · {t.processed}: {issueProgress.processed}/{issueProgress.total} · {t.failed}: {issueProgress.failed}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" aria-valuemin={0} aria-valuemax={issueProgress.total} aria-valuenow={issueProgress.successful} aria-label={t.progress}>
                <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-200" style={{ width: `${issueProgress.total ? (issueProgress.successful / issueProgress.total) * 100 : 0}%` }} />
              </div>
            </section>
          )}

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              {t.selected}:{" "}
              <strong className="text-slate-900 dark:text-white">
                {selectedStudents.length}
              </strong>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!academicYearId) {
                  setError(t.yearRequired);
                  return;
                }

                if (selectedStudents.length === 0) {
                  setError(t.studentRequired);
                  return;
                }

                if (
                  certificateType === "APPRECIATION_ACHIEVEMENT" &&
                  !notes.trim()
                ) {
                  setError(t.reasonRequired);
                  return;
                }

                setError("");
                setConfirming(true);
              }}
              disabled={
                issuing ||
                loadingPreview ||
                selectedStudents.length === 0 ||
                (certificateType === "APPRECIATION_ACHIEVEMENT" &&
                  !notes.trim())
              }
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                certificateType === "SCHOOL_COMPLETION"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : certificateType === "APPRECIATION_ACHIEVEMENT"
                    ? "bg-purple-600 hover:bg-purple-700"
                    : certificateType === "MID_TERM"
                      ? "bg-sky-600 hover:bg-sky-700"
                      : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {issuing ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Award size={18} />
              )}
              {issuing
                ? t.issuing
                : `${t.issueButton} (${selectedStudents.length})`}
            </button>
          </div>
        </section>
        </div>
      ) : (
        <section className={cardClass}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">{t.historyTitle}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t.historyDescription}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadHistory()}
              disabled={loadingHistory}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {loadingHistory ? (
                <Loader2 className="animate-spin" size={17} />
              ) : (
                <History size={17} />
              )}
              {loadingHistory ? t.loadingHistory : t.historyTab}
            </button>
          </div>

          <section className="mt-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <h3 className="text-sm font-bold">{t.historySummary} · {selectedYear?.name}</h3>
            {historySummary.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {historySummary.map((item) => (
                  <div key={`${item.type}-${item.className}`} className="rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800">
                    <span className="font-semibold">{getCertificateOption(item.type).label[language]}</span>
                    <span className="mx-1 text-slate-400">·</span>
                    <span>{item.className}</span>
                    <span className="mx-1 text-slate-400">·</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t.noHistorySummary}</p>
            )}
          </section>

          <div className="mt-5 max-h-[420px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">
                    {t.student}
                  </th>
                  <th className="px-4 py-3 text-start font-semibold">
                    {t.admission}
                  </th>
                  <th className="px-4 py-3 text-start font-semibold">
                    {t.classColumn}
                  </th>
                  <th className="px-4 py-3 text-start font-semibold">
                    {t.date}
                  </th>
                  <th className="px-4 py-3 text-start font-semibold">
                    {t.notes}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      {record.student.fullName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {record.student.admissionNumber || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {record.class.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDate(record.issuedAt, language)}
                    </td>
                    <td className="max-w-80 px-4 py-3">
                      <span className="block whitespace-normal break-words text-slate-600 dark:text-slate-300">
                        {record.notes || t.noNotes}
                      </span>
                    </td>
                  </tr>
                ))}

                {!loadingHistory && history.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                    >
                      {t.noHistory}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>{selectedCertificate.label[language]}</span>
            <span>
              {t.records}: {history.length}
            </span>
          </div>
        </section>
      )}

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setConfirming(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="certificate-confirm-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <ShieldCheck size={22} />
              </div>

              <div>
                <h2
                  id="certificate-confirm-title"
                  className="text-lg font-bold"
                >
                  {t.confirmTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {t.confirm}
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {selectedCertificate.label[language]} —{" "}
                  {selectedStudents.length}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {selectedYear?.name} ·{" "}
                  {language === "ar"
                    ? t.arabic
                    : language === "fr"
                      ? t.french
                      : t.english}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t.cancel}
              </button>

              <button
                type="button"
                onClick={() => void issueCertificates()}
                disabled={issuing || loadingPreview}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {issuing ? t.issuing : t.confirmIssue}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
