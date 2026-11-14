
export type Locale = "en" | "ar" | "fr"

export const locales: Locale[] = [
    "en",
    "ar",
    "fr",
]

export const defaultLocale: Locale = "en"

export const localeNames: Record<
    Locale,
    string
> = {
    en: "English",
    ar: "العربية",
    fr: "Français",
}

export const localeDirections: Record<
    Locale,
    "ltr" | "rtl"
> = {
    en: "ltr",
    ar: "rtl",
    fr: "ltr",
}

const english = {
    common: {
        save: "Save",
        cancel: "Cancel",
        edit: "Edit",
        delete: "Delete",
        add: "Add",
        close: "Close",
        search: "Search",
        loading: "Loading...",
        actions: "Actions",
        settings: "Settings",
        language: "Language",
        theme: "Theme",
        light: "Light",
        dark: "Dark",
        system: "System",
        english: "English",
        arabic: "Arabic",
        french: "French",
    },

    register: {
        schoolManagementSystem:
            "School Management System",

        registerYourSchool:
            "Register Your School",

        createAccountDescription:
            "Create your school account and start managing your school.",

        registrationFailed:
            "Registration failed",

        somethingWentWrong:
            "Something went wrong. Please try again.",

        schoolName:
            "School Name",

        schoolNamePlaceholder:
            "Enter school name",

        schoolSlug:
            "School Slug",

        schoolSlugPlaceholder:
            "my-school",

        principalName:
            "Principal Name",

        principalNamePlaceholder:
            "Enter principal name",

        principalEmail:
            "Principal Email",

        principalEmailPlaceholder:
            "principal@example.com",

        password:
            "Password",

        passwordPlaceholder:
            "Minimum 8 characters",

        passwordHint:
            "Password must contain at least 8 characters.",

        creatingSchool:
            "Creating School...",

        createSchool:
            "Create School",

        alreadyHaveAccount:
            "Already have a school account?",

        signIn:
            "Sign in",
    },

    navigation: {
        dashboard: "Dashboard",
        students: "Students",
        teachers: "Teachers",
        classes: "Classes",
        subjects: "Subjects",
        departments: "Departments",
        exams: "Exams",
        grades: "Grades",
        attendance: "Attendance",
        results: "Results",
        analytics: "Analytics",
        academicYear: "Academic Year",
        departmentHeads: "Department Heads",
        notifications: "Notifications",
        profile: "Profile",
        settings: "Settings",
        logout: "Logout",
    },

    attendance: {
        schoolManagementSystem:
            "School Management System",

        dailyAttendance:
            "Daily Attendance",

        description:
            "Mark students present or absent.",

        classLabel:
            "Class",

        subject:
            "Subject",

        date:
            "Date",

        selectClass:
            "Select class",

        selectSubject:
            "Select subject",

        openingRegister:
            "Opening Register...",

        openRegister:
            "Open Attendance Register",

        somethingWentWrong:
            "Something went wrong",

        attendanceRegister:
            "Attendance Register",

        status:
            "Status",

        present:
            "Present",

        absent:
            "Absent",

        late:
            "Late",

        excused:
            "Excused",

        students:
            "students",

        student:
            "Student",

        totalRecords:
            "Total Records",

        savedForStudent:
            "{name}: {status}",

        noStudents:
            "No students found",

        noStudentsDescription:
            "There are no students enrolled in this class.",

        loading:
            "Loading attendance...",

        failedToLoadAssignments:
            "Failed to load assignments",

        failedToLoadRoster:
            "Failed to load attendance roster",

        failedToUpdate:
            "Failed to update attendance",

        failedToCreate:
            "Failed to create attendance",

        failedToSave:
            "Failed to save attendance",
    },

    departments: {
        title: "Departments",

        description:
            "Create, edit, and manage the academic departments in your school.",

        academicManagement:
            "Academic Management",

        count:
            "departments",

        addTitle:
            "Add New Department",

        addDescription:
            "Enter a name for the new academic department.",

        name:
            "Department Name",

        placeholder:
            "e.g. Mathematics",

        addDepartment:
            "Add Department",

        creating:
            "Creating...",

        existingTitle:
            "Existing Departments",

        existingDescription:
            "Departments currently registered in your school.",

        emptyTitle:
            "No departments found",

        emptyDescription:
            "Add your first department using the form above.",

        department:
            "Academic department",

        deleteConfirm:
            "Delete this department?",

        deleteWithSubjects:
            "Cannot delete this department because it has subjects.",

        deleteFailed:
            "Failed to delete department",
    },

    subjects: {
        title: "Subjects",

        description:
            "Manage the subjects offered by your school and organize them by academic department.",

        subjects:
            "Subjects",

        departments:
            "Departments",
    },

    classes: {
        title: "Classes",

        description:
            "Manage your school classes and organize students by grade level.",
    },
    reports: {
    dailyAttendanceReport: "Daily Attendance Report",
    departmentDailyReport: "Department Daily Report",
    myDailyAttendanceReport: "My Daily Attendance Report",
    classDailyReport: "Class Daily Report",
    dailyReport: "Daily Report",

    wholeSchoolStatus:
        "Whole-school attendance submission status",

    departmentStatus:
        "Attendance submission status for your department",

    yourStatus:
        "Your attendance submission status",

    assignedClassesStatus:
        "Attendance submission status for your assigned classes",

    noDepartmentAssignment:
        "Department assignment is required.",

    noClassAssignment:
        "No class is assigned to you for the active academic year.",

    noReportForRole:
        "No daily report is available for this role yet.",

    reportDate: "Report date",

    submitted: "Submitted",
    partial: "Partial",
    missing: "Missing",
    noStudents: "No students",

    attendanceSubmissions:
        "Attendance submissions",

    noAttendanceAssignments:
        "No attendance assignments found.",

    teacher: "Teacher",
    class: "Class",
    subject: "Subject",
    students: "Students",
    status: "Status",

    schoolManagementSystem:
        "School Management System",
},
} as const

const arabic = {
    common: {
        save: "حفظ",
        cancel: "إلغاء",
        edit: "تعديل",
        delete: "حذف",
        add: "إضافة",
        close: "إغلاق",
        search: "بحث",
        loading: "جارٍ التحميل...",
        actions: "الإجراءات",
        settings: "الإعدادات",
        language: "اللغة",
        theme: "المظهر",
        light: "فاتح",
        dark: "داكن",
        system: "النظام",
        english: "الإنجليزية",
        arabic: "العربية",
        french: "الفرنسية",
    },

    register: {
        schoolManagementSystem:
            "نظام إدارة المدارس",

        registerYourSchool:
            "تسجيل مدرستك",

        createAccountDescription:
            "أنشئ حساب مدرستك وابدأ في إدارة مدرستك.",

        registrationFailed:
            "فشل التسجيل",

        somethingWentWrong:
            "حدث خطأ ما. يرجى المحاولة مرة أخرى.",

        schoolName:
            "اسم المدرسة",

        schoolNamePlaceholder:
            "أدخل اسم المدرسة",

        schoolSlug:
            "معرّف المدرسة",

        schoolSlugPlaceholder:
            "my-school",

        principalName:
            "اسم المدير",

        principalNamePlaceholder:
            "أدخل اسم المدير",

        principalEmail:
            "البريد الإلكتروني للمدير",

        principalEmailPlaceholder:
            "principal@example.com",

        password:
            "كلمة المرور",

        passwordPlaceholder:
            "8 أحرف على الأقل",

        passwordHint:
            "يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل.",

        creatingSchool:
            "جارٍ إنشاء المدرسة...",

        createSchool:
            "إنشاء المدرسة",

        alreadyHaveAccount:
            "هل لديك حساب مدرسة بالفعل؟",

        signIn:
            "تسجيل الدخول",
    },

    navigation: {
        dashboard: "لوحة التحكم",
        students: "الطلاب",
        teachers: "المعلمون",
        classes: "الفصول",
        subjects: "المواد الدراسية",
        departments: "الأقسام",
        exams: "الامتحانات",
        grades: "الدرجات",
        attendance: "الحضور",
        results: "النتائج",
        analytics: "التحليلات",
        academicYear: "السنة الدراسية",
        departmentHeads: "رؤساء الأقسام",
        notifications: "الإشعارات",
        profile: "الملف الشخصي",
        settings: "الإعدادات",
        logout: "تسجيل الخروج",
    },

    attendance: {
        schoolManagementSystem:
            "نظام إدارة المدارس",

        dailyAttendance:
            "الحضور اليومي",

        description:
            "تسجيل حضور وغياب الطلاب.",

        classLabel:
            "الفصل",

        subject:
            "المادة",

        date:
            "التاريخ",

        selectClass:
            "اختر الفصل",

        selectSubject:
            "اختر المادة",

        openingRegister:
            "جارٍ فتح سجل الحضور...",

        openRegister:
            "فتح سجل الحضور",

        somethingWentWrong:
            "حدث خطأ ما",

        attendanceRegister:
            "سجل الحضور",

        status:
            "الحالة",

        present:
            "حاضر",

        absent:
            "غائب",

        late:
            "متأخر",

        excused:
            "معذور",

        students:
            "طلاب",

        student:
            "الطالب",

        totalRecords:
            "إجمالي السجلات",

        savedForStudent:
            "{name}: {status}",

        noStudents:
            "لم يتم العثور على طلاب",

        noStudentsDescription:
            "لا يوجد طلاب مسجلون في هذا الفصل.",

        loading:
            "جارٍ تحميل الحضور...",

        failedToLoadAssignments:
            "فشل تحميل التكليفات",

        failedToLoadRoster:
            "فشل تحميل سجل الحضور",

        failedToUpdate:
            "فشل تحديث الحضور",

        failedToCreate:
            "فشل إنشاء سجل الحضور",

        failedToSave:
            "فشل حفظ الحضور",
    },

    departments: {
        title:
            "الأقسام",

        description:
            "إنشاء وتعديل وإدارة الأقسام الأكاديمية في مدرستك.",

        academicManagement:
            "الإدارة الأكاديمية",

        count:
            "أقسام",

        addTitle:
            "إضافة قسم جديد",

        addDescription:
            "أدخل اسم القسم الأكاديمي الجديد.",

        name:
            "اسم القسم",

        placeholder:
            "مثال: قسم الرياضيات",

        addDepartment:
            "إضافة قسم",

        creating:
            "جارٍ الإنشاء...",

        existingTitle:
            "الأقسام الحالية",

        existingDescription:
            "الأقسام المسجلة حاليًا في مدرستك.",

        emptyTitle:
            "لا توجد أقسام",

        emptyDescription:
            "أضف أول قسم باستخدام النموذج أعلاه.",

        department:
            "قسم أكاديمي",

        deleteConfirm:
            "هل تريد حذف هذا القسم؟",

        deleteWithSubjects:
            "لا يمكن حذف هذا القسم لأنه يحتوي على مواد دراسية.",

        deleteFailed:
            "فشل حذف القسم",
    },

    subjects: {
        title:
            "المواد الدراسية",

        description:
            "إدارة المواد الدراسية المقدمة في مدرستك وتنظيمها حسب القسم الأكاديمي.",

        subjects:
            "المواد",

        departments:
            "الأقسام",
    },

    classes: {
        title:
            "الفصول",

        description:
            "إدارة فصول المدرسة وتنظيم الطلاب حسب المستوى الدراسي.",
    },
    reports: {
    dailyAttendanceReport:
        "تقرير الحضور اليومي",

    departmentDailyReport:
        "التقرير اليومي للقسم",

    myDailyAttendanceReport:
        "تقريري اليومي للحضور",

    classDailyReport:
        "التقرير اليومي للفصل",

    dailyReport:
        "التقرير اليومي",

    wholeSchoolStatus:
        "حالة تسجيل الحضور على مستوى المدرسة بالكامل",

    departmentStatus:
        "حالة تسجيل الحضور لقسمك",

    yourStatus:
        "حالة تسجيل الحضور الخاصة بك",

    assignedClassesStatus:
        "حالة تسجيل الحضور للفصول المعيّنة لك",

    noDepartmentAssignment:
        "يجب تعيينك إلى قسم أولًا.",

    noClassAssignment:
        "لا يوجد فصل معيّن لك في السنة الدراسية الحالية.",

    noReportForRole:
        "لا يوجد تقرير يومي متاح لهذا الدور حاليًا.",

    reportDate:
        "تاريخ التقرير",

    submitted:
        "مكتمل",

    partial:
        "جزئي",

    missing:
        "مفقود",

    noStudents:
        "لا يوجد طلاب",

    attendanceSubmissions:
        "سجلات الحضور",

    noAttendanceAssignments:
        "لم يتم العثور على تكليفات حضور.",

    teacher:
        "المعلم",

    class:
        "الفصل",

    subject:
        "المادة",

    students:
        "الطلاب",

    status:
        "الحالة",

    schoolManagementSystem:
        "نظام إدارة المدارس",
},
} as const

const french = {
    common: {
        save: "Enregistrer",
        cancel: "Annuler",
        edit: "Modifier",
        delete: "Supprimer",
        add: "Ajouter",
        close: "Fermer",
        search: "Rechercher",
        loading: "Chargement...",
        actions: "Actions",
        settings: "Paramètres",
        language: "Langue",
        theme: "Thème",
        light: "Clair",
        dark: "Sombre",
        system: "Système",
        english: "Anglais",
        arabic: "Arabe",
        french: "Français",
    },

    register: {
        schoolManagementSystem:
            "Système de gestion scolaire",

        registerYourSchool:
            "Enregistrer votre école",

        createAccountDescription:
            "Créez le compte de votre école et commencez à la gérer.",

        registrationFailed:
            "Échec de l'inscription",

        somethingWentWrong:
            "Une erreur s'est produite. Veuillez réessayer.",

        schoolName:
            "Nom de l'école",

        schoolNamePlaceholder:
            "Saisissez le nom de l'école",

        schoolSlug:
            "Identifiant de l'école",

        schoolSlugPlaceholder:
            "mon-ecole",

        principalName:
            "Nom du directeur",

        principalNamePlaceholder:
            "Saisissez le nom du directeur",

        principalEmail:
            "E-mail du directeur",

        principalEmailPlaceholder:
            "directeur@example.com",

        password:
            "Mot de passe",

        passwordPlaceholder:
            "8 caractères minimum",

        passwordHint:
            "Le mot de passe doit contenir au moins 8 caractères.",

        creatingSchool:
            "Création de l'école...",

        createSchool:
            "Créer l'école",

        alreadyHaveAccount:
            "Vous avez déjà un compte scolaire ?",

        signIn:
            "Se connecter",
    },

    navigation: {
        dashboard:
            "Tableau de bord",

        students:
            "Élèves",

        teachers:
            "Enseignants",

        classes:
            "Classes",

        subjects:
            "Matières",

        departments:
            "Départements",

        exams:
            "Examens",

        grades:
            "Notes",

        attendance:
            "Présence",

        results:
            "Résultats",

        analytics:
            "Analyses",

        academicYear:
            "Année scolaire",

        departmentHeads:
            "Chefs de département",

        notifications:
            "Notifications",

        profile:
            "Profil",

        settings:
            "Paramètres",

        logout:
            "Déconnexion",
    },

    attendance: {
        schoolManagementSystem:
            "Système de gestion scolaire",

        dailyAttendance:
            "Présence quotidienne",

        description:
            "Marquez les élèves présents ou absents.",

        classLabel:
            "Classe",

        subject:
            "Matière",

        date:
            "Date",

        selectClass:
            "Sélectionner une classe",

        selectSubject:
            "Sélectionner une matière",

        openingRegister:
            "Ouverture du registre...",

        openRegister:
            "Ouvrir le registre de présence",

        somethingWentWrong:
            "Une erreur s'est produite",

        attendanceRegister:
            "Registre de présence",

        status:
            "Statut",

        present:
            "Présent",

        absent:
            "Absent",

        late:
            "En retard",

        excused:
            "Excusé",

        students:
            "élèves",

        student:
            "Élève",

        totalRecords:
            "Total des enregistrements",

        savedForStudent:
            "{name} : {status}",

        noStudents:
            "Aucun élève trouvé",

        noStudentsDescription:
            "Aucun élève n'est inscrit dans cette classe.",

        loading:
            "Chargement des présences...",

        failedToLoadAssignments:
            "Échec du chargement des affectations",

        failedToLoadRoster:
            "Échec du chargement du registre de présence",

        failedToUpdate:
            "Échec de la mise à jour de la présence",

        failedToCreate:
            "Échec de la création de la présence",

        failedToSave:
            "Échec de l'enregistrement de la présence",
    },

    departments: {
        title:
            "Départements",

        description:
            "Créer, modifier et gérer les départements académiques de votre école.",

        academicManagement:
            "Gestion académique",

        count:
            "départements",

        addTitle:
            "Ajouter un nouveau département",

        addDescription:
            "Saisissez le nom du nouveau département académique.",

        name:
            "Nom du département",

        placeholder:
            "ex. Mathématiques",

        addDepartment:
            "Ajouter le département",

        creating:
            "Création...",

        existingTitle:
            "Départements existants",

        existingDescription:
            "Départements actuellement enregistrés dans votre école.",

        emptyTitle:
            "Aucun département trouvé",

        emptyDescription:
            "Ajoutez votre premier département à l'aide du formulaire ci-dessus.",

        department:
            "Département académique",

        deleteConfirm:
            "Supprimer ce département ?",

        deleteWithSubjects:
            "Impossible de supprimer ce département car il contient des matières.",

        deleteFailed:
            "Échec de la suppression du département",
    },

    subjects: {
        title:
            "Matières",

        description:
            "Gérer les matières proposées par votre école et les organiser par département académique.",

        subjects:
            "Matières",

        departments:
            "Départements",
    },

    classes: {
        title:
            "Classes",

        description:
            "Gérer les classes de votre école et organiser les élèves par niveau scolaire.",
    },
    reports: {
    dailyAttendanceReport:
        "Rapport quotidien des présences",

    departmentDailyReport:
        "Rapport quotidien du département",

    myDailyAttendanceReport:
        "Mon rapport quotidien des présences",

    classDailyReport:
        "Rapport quotidien de la classe",

    dailyReport:
        "Rapport quotidien",

    wholeSchoolStatus:
        "État des présences pour toute l'école",

    departmentStatus:
        "État des présences pour votre département",

    yourStatus:
        "État de vos enregistrements de présence",

    assignedClassesStatus:
        "État des présences pour vos classes attribuées",

    noDepartmentAssignment:
        "Une affectation à un département est requise.",

    noClassAssignment:
        "Aucune classe ne vous est attribuée pour l'année scolaire active.",

    noReportForRole:
        "Aucun rapport quotidien n'est disponible pour ce rôle pour le moment.",

    reportDate:
        "Date du rapport",

    submitted:
        "Terminé",

    partial:
        "Partiel",

    missing:
        "Manquant",

    noStudents:
        "Aucun élève",

    attendanceSubmissions:
        "Enregistrements des présences",

    noAttendanceAssignments:
        "Aucune affectation de présence trouvée.",

    teacher:
        "Enseignant",

    class:
        "Classe",

    subject:
        "Matière",

    students:
        "Élèves",

    status:
        "Statut",

    schoolManagementSystem:
        "Système de gestion scolaire",
},
} as const

export const translations = {
    en: english,
    ar: arabic,
    fr: french,
} as const

export type TranslationTree =
    typeof translations.en

