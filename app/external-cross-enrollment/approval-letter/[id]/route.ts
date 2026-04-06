import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import {
  buildExternalCrossEnrollmentApprovalProgramLabel,
  getExternalCrossEnrollmentApprovalLetterData,
} from "@/app/lib/externalCrossEnrollmentApproval";

type TextSegment = {
  text: string;
  bold?: boolean;
};

function wrapPlainText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, size);
    if (width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function wrapRichText(
  segments: TextSegment[],
  regularFont: PDFFont,
  boldFont: PDFFont,
  size: number,
  maxWidth: number,
) {
  const lines: TextSegment[][] = [];
  let currentLine: TextSegment[] = [];
  let currentWidth = 0;

  const pushToken = (text: string, bold: boolean) => {
    const font = bold ? boldFont : regularFont;
    const tokenWidth = font.widthOfTextAtSize(text, size);
    if (currentWidth + tokenWidth > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
      if (text === " ") return;
    }
    currentLine.push({ text, bold });
    currentWidth += tokenWidth;
  };

  for (const segment of segments) {
    const parts = segment.text.split(/(\s+)/).filter((part) => part.length > 0);
    for (const part of parts) {
      pushToken(part, Boolean(segment.bold));
    }
  }

  if (currentLine.length > 0) lines.push(currentLine);
  return lines;
}

function drawRichTextLine(
  page: PDFPage,
  line: TextSegment[],
  x: number,
  y: number,
  size: number,
  regularFont: PDFFont,
  boldFont: PDFFont,
) {
  let cursorX = x;
  for (const segment of line) {
    const font = segment.bold ? boldFont : regularFont;
    page.drawText(segment.text, {
      x: cursorX,
      y,
      size,
      font,
      color: rgb(0.13, 0.09, 0.05),
    });
    cursorX += font.widthOfTextAtSize(segment.text, size);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const requestId = Number(id);

  if (!Number.isFinite(requestId)) {
    return new NextResponse("Invalid approval letter request.", { status: 400 });
  }

  const data = await getExternalCrossEnrollmentApprovalLetterData(requestId);
  if (!data) {
    return new NextResponse("Approved external cross-enrollment request not found.", {
      status: 404,
    });
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const regularFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const marginX = 48;
  const usableWidth = pageWidth - marginX * 2;
  let cursorY = pageHeight - 58;

  const schoolName = "Colegio de Sta. Teresa de Avila";
  const schoolAddress =
    "1177 Quirino Highway, Barangay Kaligayahan, Novaliches, Quezon City";
  const schoolNameWidth = boldFont.widthOfTextAtSize(schoolName, 19);
  const schoolAddressWidth = regularFont.widthOfTextAtSize(schoolAddress, 9.5);
  const logoWidth = 48;
  const logoHeight = 48;
  const headerGap = 14;
  const headerTextWidth = Math.max(schoolNameWidth, schoolAddressWidth);
  const headerGroupWidth = logoWidth + headerGap + headerTextWidth;
  const headerGroupX = (pageWidth - headerGroupWidth) / 2;
  const logoX = headerGroupX;
  const textX = logoX + logoWidth + headerGap;

  const logoPath = path.join(process.cwd(), "public", "logo.png");
  try {
    const logoBytes = await fs.readFile(logoPath);
    const logoImage = await pdfDoc.embedPng(logoBytes);
    page.drawImage(logoImage, {
      x: logoX,
      y: cursorY - 50,
      width: logoWidth,
      height: logoHeight,
    });
  } catch {
    // Continue without logo if the asset is unavailable.
  }

  page.drawText(schoolName, {
    x: textX + (headerTextWidth - schoolNameWidth) / 2,
    y: cursorY - 8,
    size: 19,
    font: boldFont,
    color: rgb(0.18, 0.1, 0.03),
  });
  page.drawText(schoolAddress, {
    x: textX + (headerTextWidth - schoolAddressWidth) / 2,
    y: cursorY - 28,
    size: 9.5,
    font: regularFont,
    color: rgb(0.24, 0.17, 0.11),
  });
  page.drawLine({
    start: { x: marginX, y: cursorY - 44 },
    end: { x: pageWidth - marginX, y: cursorY - 44 },
    thickness: 1.2,
    color: rgb(0.29, 0.17, 0.08),
  });

  cursorY -= 74;

  const title = "EXTERNAL CROSS-ENROLLMENT APPROVAL";
  const titleWidth = boldFont.widthOfTextAtSize(title, 14.5);
  page.drawText(title, {
    x: (pageWidth - titleWidth) / 2,
    y: cursorY,
    size: 14.5,
    font: boldFont,
    color: rgb(0.18, 0.1, 0.03),
  });

  cursorY -= 28;

  const programLabel = buildExternalCrossEnrollmentApprovalProgramLabel(data);
  const approvedDate = data.approvedAt
    ? data.approvedAt.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  const metadata: Array<[string, string]> = [
    ["Student Name:", data.studentName],
    ["Student Number:", data.studentNumber],
    ["Program:", programLabel],
    ["Year Level:", data.yearLevel ? `Year ${data.yearLevel}` : "N/A"],
    ["Subject:", `${data.subjectCode} - ${data.subjectTitle}`],
    ["Units:", String(data.unitsTotal)],
    ["External School:", data.externalSchoolName],
    ["Term:", `${data.academicYear} / Semester ${data.semester}`],
    ["Approval Date:", approvedDate],
  ];

  const leftColX = marginX;
  const rightColX = marginX + usableWidth / 2 + 12;
  const rowHeight = 22;
  const labelWidth = 92;
  const valueWidth = usableWidth / 2 - labelWidth - 22;

  metadata.forEach((item, index) => {
    const colX = index % 2 === 0 ? leftColX : rightColX;
    const rowIndex = Math.floor(index / 2);
    const y = cursorY - rowIndex * rowHeight;

    page.drawText(item[0], {
      x: colX,
      y,
      size: 10.5,
      font: boldFont,
      color: rgb(0.18, 0.1, 0.03),
    });

    const valueLines = wrapPlainText(item[1], regularFont, 10.2, valueWidth);
    valueLines.forEach((line, lineIndex) => {
      page.drawText(line, {
        x: colX + labelWidth,
        y: y - lineIndex * 11,
        size: 10.2,
        font: regularFont,
        color: rgb(0.13, 0.09, 0.05),
      });
    });
  });

  cursorY -= Math.ceil(metadata.length / 2) * rowHeight + 20;

  const narrativeSegments: TextSegment[] = [
    { text: "This is to formally certify that " },
    { text: data.studentName, bold: true },
    { text: ", bearing student number " },
    { text: data.studentNumber, bold: true },
    { text: ", enrolled in the program " },
    { text: programLabel, bold: true },
    { text: " and currently classified under " },
    { text: data.yearLevel ? `Year ${data.yearLevel}` : "current year level", bold: true },
    { text: ", is hereby granted approval to take the subject " },
    { text: `${data.subjectCode} - ${data.subjectTitle}`, bold: true },
    { text: " with an equivalent academic load of " },
    { text: `${data.unitsTotal} unit${data.unitsTotal === 1 ? "" : "s"}`, bold: true },
    { text: " through external cross-enrollment at " },
    { text: data.externalSchoolName, bold: true },
    { text: " for " },
    { text: `Academic Year ${data.academicYear}, Semester ${data.semester}`, bold: true },
    {
      text:
        ". This approval is issued after review of the student's academic requirement, subject availability, and institutional endorsement for the requested arrangement. The student is authorized to present this document to the receiving school as proof that the home institution recognizes and permits the external enrollment of the stated subject, subject to the receiving school's admission, scheduling, and documentation requirements. All academic records, completion evidence, and corresponding grades must be submitted back to the home institution for evaluation, validation, and posting in accordance with school policies and the registrar's procedures.",
    },
  ];

  const paragraphLines = wrapRichText(
    narrativeSegments,
    regularFont,
    boldFont,
    11.2,
    usableWidth,
  );

  paragraphLines.forEach((line) => {
    drawRichTextLine(page, line, marginX, cursorY, 11.2, regularFont, boldFont);
    cursorY -= 18;
  });

  cursorY -= 26;

  const signatureY = Math.max(cursorY - 34, 112);
  const leftSigX = marginX;
  const rightSigX = pageWidth / 2 + 14;
  const sigWidth = usableWidth / 2 - 20;

  page.drawLine({
    start: { x: leftSigX, y: signatureY },
    end: { x: leftSigX + sigWidth, y: signatureY },
    thickness: 0.9,
    color: rgb(0.15, 0.1, 0.05),
  });
  page.drawLine({
    start: { x: rightSigX, y: signatureY },
    end: { x: rightSigX + sigWidth, y: signatureY },
    thickness: 0.9,
    color: rgb(0.15, 0.1, 0.05),
  });

  const deanName = data.approvedByName || "Dean";
  const deanNameWidth = regularFont.widthOfTextAtSize(deanName, 9.5);
  page.drawText(deanName, {
    x: leftSigX + (sigWidth - deanNameWidth) / 2,
    y: signatureY - 15,
    size: 9.5,
    font: regularFont,
    color: rgb(0.13, 0.09, 0.05),
  });

  const deanCaption = "Dean Approval / Signature over Printed Name";
  const deanCaptionWidth = regularFont.widthOfTextAtSize(deanCaption, 8.7);
  page.drawText(deanCaption, {
    x: leftSigX + (sigWidth - deanCaptionWidth) / 2,
    y: signatureY - 31,
    size: 8.7,
    font: regularFont,
    color: rgb(0.13, 0.09, 0.05),
  });

  const dateCaption = "Date Signed";
  const dateCaptionWidth = regularFont.widthOfTextAtSize(dateCaption, 8.7);
  page.drawText(dateCaption, {
    x: rightSigX + (sigWidth - dateCaptionWidth) / 2,
    y: signatureY - 31,
    size: 8.7,
    font: regularFont,
    color: rgb(0.13, 0.09, 0.05),
  });

  const pdfBytes = await pdfDoc.save();
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="external-cross-enrollment-approval-${requestId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
