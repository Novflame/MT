"use client"

import { useMemo, useState } from "react"
import styles from "./certificate-templates.module.css"

export type SchoolCertificateType =
    | "MID_TERM"
    | "SCHOOL_COMPLETION"
    | "APPRECIATION_ACHIEVEMENT"

export type CertificateLanguage = "ar" | "en" | "fr"

export type CertificateStudent = {
    fullName: string
    className: string
    academicYear: string
    schoolName: string
    schoolSubtitle?: string
    issueDate?: string
    sectionName?: string
    principalName?: string
    departmentHeadName?: string
}

type Props = {
    student: CertificateStudent
    certificateType: SchoolCertificateType
    language: CertificateLanguage
    message: string
    onMessageChange: (message: string) => void
    onPrint?: () => void
}

const copy = {
    ar: {
        school: "المدرسة",
        ministry: "العام الدراسي",
        MID_TERM: "شهادة منتصف العام الدراسي",
        SCHOOL_COMPLETION: "شهادة إتمام الدراسة",
        APPRECIATION_ACHIEVEMENT: "شهادة التقدير والإنجاز",
        awarded: "تُمنح هذه الشهادة إلى",
        class: "الصف",
        year: "السنة الدراسية",
        principal: "مدير المدرسة",
        head: "رئيس القسم",
        date: "التاريخ",
        messageLabel: "الرسالة المكتوبة على الشهادة",
        messageHint: "اكتب رسالة التهنئة أو التقدير التي ستظهر على الشهادة…",
        print: "طباعة الشهادة",
    },
    en: {
        school: "SCHOOL",
        ministry: "ACADEMIC YEAR",
        MID_TERM: "Mid-Term Certificate",
        SCHOOL_COMPLETION: "School Completion Certificate",
        APPRECIATION_ACHIEVEMENT: "Certificate of Appreciation & Achievement",
        awarded: "This certificate is awarded to",
        class: "Class",
        year: "Academic Year",
        principal: "Principal",
        head: "Head of Department",
        date: "Date",
        messageLabel: "Message printed on the certificate",
        messageHint: "Write the congratulatory or appreciation message…",
        print: "Print certificate",
    },
    fr: {
        school: "ÉCOLE",
        ministry: "ANNÉE SCOLAIRE",
        MID_TERM: "Certificat de mi-parcours",
        SCHOOL_COMPLETION: "Certificat d’achèvement scolaire",
        APPRECIATION_ACHIEVEMENT: "Certificat de reconnaissance et de réussite",
        awarded: "Ce certificat est décerné à",
        class: "Classe",
        year: "Année scolaire",
        principal: "Directeur de l’école",
        head: "Responsable du département",
        date: "Date",
        messageLabel: "Message imprimé sur le certificat",
        messageHint: "Écrivez le message de félicitations ou de reconnaissance…",
        print: "Imprimer le certificat",
    },
} as const

const palette = {
    MID_TERM: "blue",
    SCHOOL_COMPLETION: "green",
    APPRECIATION_ACHIEVEMENT: "purple",
} as const

export default function CertificateTemplatePreview({
    student,
    certificateType,
    language,
    message,
    onMessageChange,
    onPrint,
}: Props) {
    const t = copy[language]
    const isArabic = language === "ar"
    const direction = isArabic ? "rtl" : "ltr"
    const [showEditor, setShowEditor] = useState(true)

    const title = useMemo(() => t[certificateType], [t, certificateType])

    return (
        <section className={styles.wrapper}>
            <div className={styles.toolbar}>
                <div>
                    <h2 className={styles.toolbarTitle}>{title}</h2>
                    <p className={styles.toolbarHint}>
                        {language === "ar"
                            ? "هذه معاينة للقالب. ستظهر بيانات الطالب والرسالة عند الطباعة."
                            : language === "fr"
                              ? "Aperçu du modèle avec les informations de l’élève et votre message."
                              : "Template preview with the student's details and your custom message."}
                    </p>
                </div>
                <div className={styles.toolbarActions}>
                    <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => setShowEditor((value) => !value)}
                    >
                        {showEditor
                            ? language === "ar" ? "إخفاء محرر الرسالة" : language === "fr" ? "Masquer le message" : "Hide message editor"
                            : language === "ar" ? "تعديل الرسالة" : language === "fr" ? "Modifier le message" : "Edit message"}
                    </button>
                    <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={() => {
                            onPrint?.()
                            window.print()
                        }}
                        disabled={!message.trim()}
                    >
                        {t.print}
                    </button>
                </div>
            </div>

            {showEditor && (
                <div className={styles.editor}>
                    <label htmlFor="certificate-message" className={styles.label}>
                        {t.messageLabel}
                    </label>
                    <textarea
                        id="certificate-message"
                        className={styles.textarea}
                        dir={direction}
                        value={message}
                        onChange={(event) => onMessageChange(event.target.value)}
                        placeholder={t.messageHint}
                        maxLength={600}
                        rows={3}
                    />
                    <div className={styles.editorFooter}>
                        <span>
                            {language === "ar"
                                ? "ستُحفظ الرسالة مع سجل الشهادة عند الإصدار."
                                : language === "fr"
                                  ? "Le message doit être enregistré avec le certificat lors de l’émission."
                                  : "The message should be saved with the certificate record when issued."}
                        </span>
                        <span>{message.length}/600</span>
                    </div>
                </div>
            )}

            <div className={styles.paperStage}>
                <article
                    className={`${styles.certificate} ${styles[palette[certificateType]]}`}
                    dir={direction}
                    lang={language}
                >
                    <div className={styles.outerFrame} />
                    <div className={styles.innerFrame} />
                    <div className={styles.cornerTopLeft} />
                    <div className={styles.cornerTopRight} />
                    <div className={styles.cornerBottomLeft} />
                    <div className={styles.cornerBottomRight} />

                    <header className={styles.certificateHeader}>
                        <div className={styles.logoMark} aria-hidden="true">
                            <span>✦</span>
                            <strong>✧</strong>
                            <span>✦</span>
                        </div>
                        <div className={styles.schoolBlock}>
                            <p className={styles.schoolName}>{student.schoolName || t.school}</p>
                            {student.schoolSubtitle && (
                                <p className={styles.schoolSubtitle}>{student.schoolSubtitle}</p>
                            )}
                        </div>
                        <div className={styles.yearBlock}>
                            <span>{t.year}</span>
                            <strong>{student.academicYear || "—"}</strong>
                        </div>
                    </header>

                    <div className={styles.laurelLeft} aria-hidden="true">❧</div>
                    <div className={styles.laurelRight} aria-hidden="true">❧</div>

                    <main className={styles.certificateBody}>
                        <p className={styles.eyebrow}>
                            {language === "ar" ? "بكل فخر واعتزاز" : language === "fr" ? "AVEC FIERTÉ" : "WITH PRIDE"}
                        </p>
                        <h1 className={styles.certificateTitle}>{title}</h1>
                        <p className={styles.awarded}>{t.awarded}</p>
                        <h2 className={styles.studentName}>{student.fullName || "—"}</h2>

                        <div className={styles.details}>
                            <span><b>{t.class}:</b> {student.className || "—"}</span>
                            {student.sectionName && <span><b>{language === "ar" ? "الشعبة" : language === "fr" ? "Section" : "Section"}:</b> {student.sectionName}</span>}
                        </div>

                        <div className={styles.messageBox}>
                            {message.trim()
                                ? message
                                : language === "ar"
                                  ? "ستظهر رسالة المستخدم هنا"
                                  : language === "fr"
                                    ? "Votre message apparaîtra ici"
                                    : "Your custom message will appear here"}
                        </div>
                    </main>

                    <footer className={styles.certificateFooter}>
                        <div className={styles.signature}>
                            <span>{t.principal}</span>
                            <div className={styles.signatureLine} />
                            <small>{student.principalName || ""}</small>
                        </div>
                        <div className={styles.seal} aria-label="School seal">
                            <div className={styles.sealInner}>✦<br /><strong>✧</strong><br />✦</div>
                        </div>
                        <div className={styles.signature}>
                            <span>{t.head}</span>
                            <div className={styles.signatureLine} />
                            <small>{student.departmentHeadName || ""}</small>
                            <small>{t.date}: {student.issueDate || "—"}</small>
                        </div>
                    </footer>
                </article>
            </div>
        </section>
    )
}
