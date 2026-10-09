"use client";

import { useState } from "react";
import {
  Award,
  CheckCircle2,
  FileCheck2,
  History,
  Loader2,
  Search,
  ShieldCheck,
  Users,
  XCircle,
  Sparkles,
} from "lucide-react";

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
    issueButton: "إصدار الشهادات",
    issuing: "جارٍ إصدار الشهادات...",
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
  onSelect,
}: {
  language: Language;
  selectedType: CertificateType;
  onSelect: (type: CertificateType) => void;
}) {
  const designs: Record<
    CertificateType,
    {
      frame: string;
      accent: string;
      ribbon: string;
      heading: Record<Language, string>;
      subtitle: Record<Language, string>;
      seal: string;
    }
  > = {
    FINAL_YEAR: {
      frame: "border-indigo-300",
      accent: "text-indigo-700",
      ribbon: "bg-indigo-600",
      heading: {
        ar: "شهادة نهاية العام",
        en: "FINAL YEAR",
        fr: "FIN D'ANNÉE",
      },
      subtitle: {
        ar: "شهادة النتائج الدراسية",
        en: "ACADEMIC RESULTS",
        fr: "RÉSULTATS SCOLAIRES",
      },
      seal: "text-indigo-600",
    },
    MID_TERM: {
      frame: "border-sky-300",
      accent: "text-sky-700",
      ribbon: "bg-sky-600",
      heading: {
        ar: "شهادة منتصف العام",
        en: "MID-TERM",
        fr: "MI-ANNÉE",
      },
      subtitle: {
        ar: "إنجازات الفصل الدراسي",
        en: "TERM ACHIEVEMENTS",
        fr: "RÉUSSITES DU TRIMESTRE",
      },
      seal: "text-sky-600",
    },
    SCHOOL_COMPLETION: {
      frame: "border-emerald-400",
      accent: "text-emerald-800",
      ribbon: "bg-emerald-800",
      heading: {
        ar: "شهادة إتمام الدراسة",
        en: "SCHOOL COMPLETION",
        fr: "FIN D'ÉTUDES",
      },
      subtitle: {
        ar: "إتمام المرحلة الدراسية",
        en: "COMPLETION OF STUDIES",
        fr: "FIN DU PARCOURS SCOLAIRE",
      },
      seal: "text-emerald-700",
    },
    APPRECIATION_ACHIEVEMENT: {
      frame: "border-purple-300",
      accent: "text-purple-800",
      ribbon: "bg-purple-700",
      heading: {
        ar: "شهادة التقدير والإنجاز",
        en: "CERTIFICATE OF ACHIEVEMENT",
        fr: "CERTIFICAT DE MÉRITE",
      },
      subtitle: {
        ar: "تقدير التميز والإنجاز",
        en: "RECOGNITION OF EXCELLENCE",
        fr: "RECONNAISSANCE DE L'EXCELLENCE",
      },
      seal: "text-purple-700",
    },
  };

  return (
    <section aria-label="Certificate designs" className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={19} className="text-amber-500" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {language === "ar"
            ? "معرض تصاميم الشهادات"
            : language === "fr"
              ? "Galerie des certificats"
              : "Certificate Gallery"}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CERTIFICATE_OPTIONS.map((option, index) => {
          const design = designs[option.value];
          const active = selectedType === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(option.value)}
              className={`group min-w-0 rounded-2xl border-2 p-3 text-start transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${
                active
                  ? `${option.colors.active} border-current`
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600"
              }`}
              style={{
                animation: `certificate-enter 500ms ${index * 100}ms both`,
              }}
            >
              <div
                className={`relative aspect-[1.36/1] overflow-hidden rounded-lg border-4 bg-[#fffdf7] p-2 transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[-1deg] ${
                  design.frame
                }`}
              >
                <div
                  className={`pointer-events-none absolute inset-1 border ${
                    design.frame
                  } opacity-70`}
                />

                <div className="relative flex h-full flex-col items-center justify-between px-1 py-2 text-center">
                  <div
                    className={`text-[9px] font-bold tracking-[0.2em] ${design.accent}`}
                  >
                    {language === "ar"
                      ? "المدرسة"
                      : language === "fr"
                        ? "ÉCOLE"
                        : "SCHOOL"}
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <Award
                      size={27}
                      strokeWidth={1.5}
                      className={`${design.seal} certificate-seal`}
                    />

                    <span
                      className={`max-w-full text-[10px] font-extrabold leading-4 sm:text-xs ${design.accent}`}
                    >
                      {design.heading[language]}
                    </span>

                    <span className="text-[8px] tracking-wide text-slate-500">
                      {design.subtitle[language]}
                    </span>
                  </div>

                  <div className="w-full space-y-1 px-3">
                    <div className="h-px bg-slate-300" />
                    <div className="mx-auto h-1 w-2/3 rounded-full bg-slate-200" />
                  </div>

                  <div
                    className={`absolute bottom-2 end-1 rounded-sm px-2 py-1 text-[7px] font-bold text-white ${design.ribbon}`}
                  >
                    {language === "ar"
                      ? "معتمدة"
                      : language === "fr"
                        ? "CERTIFIÉ"
                        : "CERTIFIED"}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold leading-5 text-slate-900 dark:text-white">
                    {option.label[language]}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {option.description[language]}
                  </p>
                </div>

                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
                    active
                      ? option.colors.icon
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                  }`}
                >
                  {active ? <CheckCircle2 size={16} /> : <Award size={14} />}
                </span>
              </div>

              {active && (
                <div
                  className={`mt-3 rounded-lg px-3 py-2 text-center text-xs font-bold ${option.colors.badge}`}
                >
                  {language === "ar"
                    ? "الشهادة المختارة"
                    : language === "fr"
                      ? "Certificat sélectionné"
                      : "Selected certificate"}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes certificate-enter {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .certificate-seal {
          animation: certificate-seal-float 3s ease-in-out infinite;
        }

        @keyframes certificate-seal-float {
          0%,
          100% {
            transform: translateY(0) rotate(0);
          }
          50% {
            transform: translateY(-3px) rotate(4deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          :global(*) {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </section>
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

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<"issue" | "history">("issue");
  const [confirming, setConfirming] = useState(false);

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

  const issuedCount = students.filter(
    (student) => student.alreadyIssued,
  ).length;

  const excludedCount = students.filter(
    (student) =>
      !student.alreadyIssued && !selectedIds.includes(student.enrollmentId),
  ).length;

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
        certificateType: nextFilters.certificateType,
        language: nextFilters.language,
      });

      if (nextFilters.classId) {
        params.set("classId", nextFilters.classId);
      }

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
    setConfirming(false);

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

  async function issueCertificates() {
    //     if (!response.ok) {
    //   throw new Error(result.error ?? t.issueError);
    // }

    if (!academicYearId) {
      setError(t.yearRequired);
      setConfirming(false);
      return;
    }

    if (selectedStudents.length === 0) {
      setError(t.studentRequired);
      setConfirming(false);
      return;
    }

    if (certificateType === "FINAL_YEAR") {
      const params = new URLSearchParams({
        academicYearId,
        enrollmentIds: selectedStudents
          .map((student) => student.enrollmentId)
          .join(","),
        language,
      });

      if (classId) {
        params.set("classId", classId);
      }

      window.location.assign(`/certificates/batch?${params.toString()}`);

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

    try {
      const response = await fetch("/api/school-certificates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academicYearId,
          certificateType,
          enrollmentIds: selectedStudents.map(
            (student) => student.enrollmentId,
          ),
          notes: notes.trim() || undefined,
          language,
          classId: classId || undefined,
        }),
      });

      const result: ApiResult = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? t.issueError);
      }

      const issuanceMessage = `${result.message ?? t.success} ${t.issuedCount}: ${
        result.issuedCount ?? 0
      }، ${t.skippedCount}: ${result.skippedCount ?? 0}.`;

      setSelectedIds([]);
      await loadPreview(filters);
      setSuccess(issuanceMessage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.issueError);
    } finally {
      setIssuing(false);
    }
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
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

        <div className="flex items-center gap-2 self-start rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          <ShieldCheck size={18} />
          {t.authorized}
        </div>
      </header>

      <CertificateShowcase
        language={language}
        selectedType={certificateType}
        onSelect={(type) => updateFilters({ certificateType: type })}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={cardClass}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {t.students}
            </span>
            <Users className="text-indigo-600" size={20} />
          </div>
          <p className="mt-3 text-3xl font-bold">{students.length}</p>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {t.issued}
            </span>
            <FileCheck2 className="text-emerald-600" size={20} />
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-700 dark:text-emerald-400">
            {issuedCount}
          </p>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {t.selected}
            </span>
            <Users className="text-blue-600" size={20} />
          </div>
          <p className="mt-3 text-3xl font-bold text-blue-700 dark:text-blue-400">
            {selectedStudents.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t.excludedCount}: {excludedCount}
          </p>
        </div>
      </section>

      <section className={cardClass}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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

        <div
          className={`mt-4 rounded-xl border p-4 ${selectedCertificate.colors.active}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${selectedCertificate.colors.badge}`}
            >
              {selectedCertificate.label[language]}
            </span>
            {selectedYear && (
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {selectedYear.name}
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {selectedCertificate.description[language]}
          </p>

          {certificateType === "FINAL_YEAR" && (
            <p className="mt-2 text-sm font-medium text-indigo-800 dark:text-indigo-300">
              {t.finalYearNote}
            </p>
          )}

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {t.languageNote}
          </p>
        </div>
      </section>

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

          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-190 text-sm">
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

          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-190 text-sm">
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
