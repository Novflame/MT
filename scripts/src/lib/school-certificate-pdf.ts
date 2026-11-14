import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as fontkit from "fontkit";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";

export type SchoolCertificateType =
  | "MID_TERM"
  | "SCHOOL_COMPLETION"
  | "APPRECIATION_ACHIEVEMENT";

export type SchoolCertificateLanguage = "ar" | "en" | "fr";

export type SchoolCertificateDocument = {
  certificateType: SchoolCertificateType;
  language: SchoolCertificateLanguage;
  fullName: string;
  schoolName: string;
  schoolSubtitle?: string | null;
  academicYear: string;
  className: string;
  sectionName?: string | null;
  admissionNumber?: string | null;
  issueDate?: string | null;
  principalName?: string | null;
  departmentHeadName?: string | null;
  message?: string | null;
  logoDataUrl?: string | null;
};

const PAGE_SIZE = {
  width: 842,
  height: 595,
};

const COPY: Record<
  SchoolCertificateLanguage,
  Record<SchoolCertificateType | "year" | "class" | "principal" | "head" | "date" | "awarded", string>
> = {
  ar: {
    year: "السنة الدراسية",
    class: "الصف",
    principal: "مدير المدرسة",
    head: "رئيس القسم",
    date: "التاريخ",
    awarded: "تُمنح هذه الشهادة إلى",
    MID_TERM: "شهادة منتصف العام الدراسي",
    SCHOOL_COMPLETION: "شهادة إتمام الدراسة",
    APPRECIATION_ACHIEVEMENT: "شهادة التقدير والإنجاز",
  },
  en: {
    year: "Academic Year",
    class: "Class",
    principal: "Principal",
    head: "Head of Department",
    date: "Date",
    awarded: "This certificate is awarded to",
    MID_TERM: "Mid-Term Certificate",
    SCHOOL_COMPLETION: "School Completion Certificate",
    APPRECIATION_ACHIEVEMENT: "Certificate of Appreciation & Achievement",
  },
  fr: {
    year: "Année scolaire",
    class: "Classe",
    principal: "Directeur de l’école",
    head: "Chef de département",
    date: "Date",
    awarded: "Ce certificat est décerné à",
    MID_TERM: "Certificat de mi-parcours",
    SCHOOL_COMPLETION: "Certificat d’achèvement scolaire",
    APPRECIATION_ACHIEVEMENT: "Certificat de reconnaissance et de réussite",
  },
};

const palette: Record<
  SchoolCertificateType,
  { primary: [number, number, number]; accent: [number, number, number]; soft: [number, number, number] }
> = {
  MID_TERM: {
    primary: [0.09, 0.28, 0.55],
    accent: [0.78, 0.67, 0.29],
    soft: [0.91, 0.96, 1],
  },
  SCHOOL_COMPLETION: {
    primary: [0.07, 0.39, 0.3],
    accent: [0.78, 0.64, 0.3],
    soft: [0.9, 0.96, 0.92],
  },
  APPRECIATION_ACHIEVEMENT: {
    primary: [0.33, 0.17, 0.54],
    accent: [0.82, 0.68, 0.35],
    soft: [0.94, 0.9, 0.98],
  },
};

const defaultMessages: Record<SchoolCertificateLanguage, Record<SchoolCertificateType, string>> = {
  ar: {
    MID_TERM: "نتطلع إلى استمرار الطالب في التفوق والنجاح خلال هذا الفصل الدراسي.",
    SCHOOL_COMPLETION: "يُشكر الطالب على مواظبته والتزامه خلال مراحل دراسته، ويُمنح شهادة إتمام الدراسة.",
    APPRECIATION_ACHIEVEMENT: "يُقدَّر هذا الإنجاز ويُشكر الطالب على جهوده ومميزاته.",
  },
  en: {
    MID_TERM: "The student is recognized for continued effort, progress, and academic commitment in this term.",
    SCHOOL_COMPLETION: "The student is recognized for perseverance and dedication throughout the academic journey.",
    APPRECIATION_ACHIEVEMENT: "This certificate is awarded in recognition of commitment, achievement, and excellence.",
  },
  fr: {
    MID_TERM: "L’élève est reconnu pour ses efforts continus, ses progrès et son engagement académique au cours de ce trimestre.",
    SCHOOL_COMPLETION: "L’élève est reconnu pour sa persévérance et son engagement pendant son parcours scolaire.",
    APPRECIATION_ACHIEVEMENT: "Ce certificat est décerné en reconnaissance de l’engagement, des résultats et de l’excellence.",
  },
};

function normalizeHtmlText(value: string | null | undefined, fallback = "—") {
  const text = value?.trim();
  return text && text.length > 0 ? text : fallback;
}

function wrapText(font: PDFFont, size: number, text: string, maxWidth: number) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return [""];
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

async function loadLogo(doc: PDFDocument, dataUrl: string | null | undefined) {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    return null;
  }

  try {
    if (dataUrl.startsWith("data:image/png;base64,")) {
      const bytes = Buffer.from(dataUrl.replace("data:image/png;base64,", ""), "base64");
      return await doc.embedPng(bytes);
    }

    if (dataUrl.startsWith("data:image/jpeg;base64,")) {
      const bytes = Buffer.from(dataUrl.replace("data:image/jpeg;base64,", ""), "base64");
      return await doc.embedJpg(bytes);
    }
  } catch {
    return null;
  }

  return null;
}

function drawDecorativeBorder(page: PDFPage, primary: [number, number, number], accent: [number, number, number]) {
  const { width, height } = page.getSize();

  const outer = rgb(primary[0], primary[1], primary[2]);
  const accentColor = rgb(accent[0], accent[1], accent[2]);

  page.drawRectangle({
    x: 16,
    y: 16,
    width: width - 32,
    height: height - 32,
    borderColor: outer,
    borderWidth: 4,
  });

  page.drawRectangle({
    x: 34,
    y: 34,
    width: width - 68,
    height: height - 68,
    borderColor: accentColor,
    borderWidth: 2,
  });

  const edgeSize = 104;

  page.drawLine({
    start: { x: 54, y: height - 54 },
    end: { x: 54 + edgeSize, y: height - 54 },
    color: accentColor,
    thickness: 2,
  });

  page.drawLine({
    start: { x: width - 54, y: height - 54 },
    end: { x: width - 54 - edgeSize, y: height - 54 },
    color: accentColor,
    thickness: 2,
  });

  page.drawLine({
    start: { x: 54, y: 54 },
    end: { x: 54 + edgeSize, y: 54 },
    color: accentColor,
    thickness: 2,
  });

  page.drawLine({
    start: { x: width - 54, y: 54 },
    end: { x: width - 54 - edgeSize, y: 54 },
    color: accentColor,
    thickness: 2,
  });
}

function calculateTextWidth(font: PDFFont, text: string, size: number) {
  return font.widthOfTextAtSize(text, size);
}

async function loadPreferredFont(pdfDoc: PDFDocument): Promise<PDFFont> {
  pdfDoc.registerFontkit(
    fontkit as unknown as Parameters<PDFDocument["registerFontkit"]>[0],
  );

  const fontCandidates = [
    process.env.PDF_FONT_PATH,
    "C:/Windows/Fonts/Tahoma.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/Segoe UI.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
    "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of fontCandidates) {
    try {
      const resolved = path.resolve(candidate);
      const fontBytes = await fs.readFile(resolved);
      return await pdfDoc.embedFont(fontBytes);
    } catch {
      // Try the next candidate if the system font is unavailable.
    }
  }

  return pdfDoc.embedFont(StandardFonts.Helvetica);
}

async function drawCertificatePage(
  pdfDoc: PDFDocument,
  certificate: SchoolCertificateDocument,
) {
  const page = pdfDoc.addPage([PAGE_SIZE.width, PAGE_SIZE.height]);
  const colors = palette[certificate.certificateType];
  const primary = rgb(colors.primary[0], colors.primary[1], colors.primary[2]);
  const accent = rgb(colors.accent[0], colors.accent[1], colors.accent[2]);
  const soft = rgb(colors.soft[0], colors.soft[1], colors.soft[2]);
  const dark = rgb(0.1, 0.14, 0.2);
  const muted = rgb(0.4, 0.47, 0.58);

  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();

  drawDecorativeBorder(page, colors.primary, colors.accent);

  const headerFont = await loadPreferredFont(pdfDoc);
  const bodyFont = headerFont;
  const titleFont = headerFont;

  const logo = await loadLogo(pdfDoc, certificate.logoDataUrl);

  if (logo) {
    const logoSize = 52;
    page.drawImage(logo, {
      x: 72,
      y: pageHeight - 138,
      width: logoSize,
      height: logoSize,
    });
  } else {
    page.drawRectangle({
      x: 72,
      y: pageHeight - 118,
      width: 54,
      height: 54,
      borderColor: accent,
      borderWidth: 2,
      color: soft,
    });
    page.drawText("*", {
      x: 94,
      y: pageHeight - 101,
      size: 18,
      font: headerFont,
      color: primary,
    });
  }

  const schoolName = normalizeHtmlText(certificate.schoolName, "School");
  const schoolSubtitle = normalizeHtmlText(certificate.schoolSubtitle, "");

  page.drawText(schoolName, {
    x: 150,
    y: pageHeight - 110,
    size: 24,
    color: primary,
    font: headerFont,
  });

  if (schoolSubtitle) {
    page.drawText(schoolSubtitle, {
      x: 150,
      y: pageHeight - 142,
      size: 11,
      color: muted,
      font: bodyFont,
    });
  }

  const yearLabel = `${COPY[certificate.language].year}:`;
  const yearValue = normalizeHtmlText(certificate.academicYear, "—");
  page.drawText(yearLabel, {
    x: pageWidth - 210,
    y: pageHeight - 112,
    size: 11,
    color: muted,
    font: bodyFont,
  });
  page.drawText(yearValue, {
    x: pageWidth - 210,
    y: pageHeight - 132,
    size: 19,
    color: primary,
    font: headerFont,
  });

  const certificateTitle = COPY[certificate.language][certificate.certificateType];
  const titleWidth = calculateTextWidth(titleFont, certificateTitle, 30);
  page.drawText(certificateTitle, {
    x: (pageWidth - titleWidth) / 2,
    y: pageHeight - 210,
    size: 30,
    color: primary,
    font: titleFont,
  });

  const awardText = COPY[certificate.language].awarded;
  page.drawText(awardText, {
    x: pageWidth / 2 - calculateTextWidth(bodyFont, awardText, 16) / 2,
    y: pageHeight - 286,
    size: 16,
    color: muted,
    font: bodyFont,
  });

  const studentName = normalizeHtmlText(certificate.fullName, "Student Name");
  const studentWidth = calculateTextWidth(titleFont, studentName, 28);
  page.drawText(studentName, {
    x: (pageWidth - studentWidth) / 2,
    y: pageHeight - 332,
    size: 28,
    color: dark,
    font: titleFont,
  });

  const className = normalizeHtmlText(certificate.className, "—");
  const classLabel = `${COPY[certificate.language].class}: ${className}`;
  const classX = (pageWidth - calculateTextWidth(bodyFont, classLabel, 14)) / 2;
  page.drawText(classLabel, {
    x: classX,
    y: pageHeight - 372,
    size: 14,
    color: dark,
    font: bodyFont,
  });

  const messageText = normalizeHtmlText(
    certificate.message || defaultMessages[certificate.language][certificate.certificateType],
    defaultMessages[certificate.language][certificate.certificateType],
  );

  page.drawRectangle({
    x: pageWidth / 2 - 290,
    y: 170,
    width: 580,
    height: 104,
    borderColor: accent,
    borderWidth: 1,
    color: soft,
    opacity: 0.32,
  });

  const messageLines = wrapText(bodyFont, 17, messageText, 500);
  messageLines.slice(0, 4).forEach((line, index) => {
    page.drawText(line, {
      x: pageWidth / 2 - 260,
      y: 225 - index * 22,
      size: 17,
      color: dark,
      font: bodyFont,
    });
  });

  const leftName = normalizeHtmlText(certificate.principalName, "Principal");
  const rightName = normalizeHtmlText(certificate.departmentHeadName, "Head of Department");

  page.drawLine({
    start: { x: 86, y: 88 },
    end: { x: 270, y: 88 },
    color: accent,
    thickness: 1.5,
  });
  page.drawText(COPY[certificate.language].principal, {
    x: 110,
    y: 56,
    size: 11,
    color: muted,
    font: bodyFont,
  });
  page.drawText(leftName, {
    x: 102,
    y: 36,
    size: 12,
    color: primary,
    font: headerFont,
  });

  page.drawLine({
    start: { x: pageWidth - 270, y: 88 },
    end: { x: pageWidth - 86, y: 88 },
    color: accent,
    thickness: 1.5,
  });
  page.drawText(COPY[certificate.language].head, {
    x: pageWidth - 240,
    y: 56,
    size: 11,
    color: muted,
    font: bodyFont,
  });
  page.drawText(rightName, {
    x: pageWidth - 248,
    y: 36,
    size: 12,
    color: primary,
    font: headerFont,
  });

  page.drawCircle({
    x: pageWidth / 2,
    y: 88,
    size: 58,
    borderColor: accent,
    borderWidth: 3,
    color: soft,
  });
  page.drawText("*", {
    x: pageWidth / 2 - 6,
    y: 75,
    size: 18,
    color: primary,
    font: headerFont,
  });

  const dateText = `${COPY[certificate.language].date}: ${normalizeHtmlText(certificate.issueDate ? new Date(certificate.issueDate).toLocaleDateString(certificate.language === "ar" ? "ar-EG" : certificate.language === "fr" ? "fr-FR" : "en-GB") : "—", "—")}`;
  page.drawText(dateText, {
    x: pageWidth / 2 - calculateTextWidth(bodyFont, dateText, 11) / 2,
    y: 28,
    size: 11,
    color: muted,
    font: bodyFont,
  });
}

export async function createSchoolCertificatePdf(certificates: SchoolCertificateDocument[]) {
  const pdfDoc = await PDFDocument.create();

  for (const certificate of certificates) {
    await drawCertificatePage(pdfDoc, certificate);
  }

  return Buffer.from(await pdfDoc.save());
}
