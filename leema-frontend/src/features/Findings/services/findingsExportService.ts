import type { FindingDataProps } from "@/features/Findings/types";

export type FileExportFormat = "PDF" | "CSV";

const FILE_EXPORT_FORMATS: FileExportFormat[] = ["PDF", "CSV"];

const CSV_COLUMNS: {
  header: string;
  getValue: (finding: FindingDataProps) => unknown;
}[] = [
  { header: "Title", getValue: (finding) => finding.title },
  { header: "Opportunity", getValue: (finding) => finding.feasibility },
  { header: "Description", getValue: (finding) => finding.description },
  {
    header: "What people are saying",
    getValue: (finding) => finding.sentiment,
  },
  { header: "Upvotes", getValue: (finding) => finding.source_upvotes },
  { header: "Comments", getValue: (finding) => finding.source_comments },
  { header: "Source URL", getValue: (finding) => finding.source_url },
];

const PAGE_MARGIN = 18;
const LINE_HEIGHT_RATIO = 0.42;

function buildFileName(extension: string) {
  const today = new Date().toISOString().slice(0, 10);
  return `leema-findings-${today}.${extension}`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const downloadUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(downloadUrl);
}

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

function formatOpportunity(feasibility: string) {
  const normalized = feasibility.toLowerCase();
  if (normalized.includes("low")) return "Low opportunity";
  if (normalized.includes("medium")) return "Medium opportunity";
  return "High opportunity";
}

export const findingsExportService = {
  isFileExportFormat(channel: string): channel is FileExportFormat {
    return FILE_EXPORT_FORMATS.includes(channel as FileExportFormat);
  },

  buildCsv(findings: FindingDataProps[]): string {
    const headerRow = CSV_COLUMNS.map((column) =>
      escapeCsvValue(column.header),
    ).join(",");
    const findingRows = findings.map((finding) =>
      CSV_COLUMNS.map((column) =>
        escapeCsvValue(column.getValue(finding)),
      ).join(","),
    );
    return [headerRow, ...findingRows].join("\r\n");
  },

  exportCsv(findings: FindingDataProps[]) {
    const csvBlob = new Blob(["﻿", this.buildCsv(findings)], {
      type: "text/csv;charset=utf-8",
    });
    downloadBlob(csvBlob, buildFileName("csv"));
  },

  async exportPdf(findings: FindingDataProps[]) {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - PAGE_MARGIN * 2;
    let cursorY = PAGE_MARGIN;

    const ensureSpace = (neededHeight: number) => {
      if (cursorY + neededHeight > pageHeight - PAGE_MARGIN) {
        pdf.addPage();
        cursorY = PAGE_MARGIN;
      }
    };

    const writeText = (
      text: string,
      options: {
        size: number;
        bold?: boolean;
        color?: number;
        gapAfter?: number;
      },
    ) => {
      pdf.setFont("helvetica", options.bold ? "bold" : "normal");
      pdf.setFontSize(options.size);
      pdf.setTextColor(options.color ?? 30);
      const lineHeight = options.size * LINE_HEIGHT_RATIO;
      const lines: string[] = pdf.splitTextToSize(text, contentWidth);
      for (const line of lines) {
        ensureSpace(lineHeight);
        pdf.text(line, PAGE_MARGIN, cursorY + lineHeight * 0.8);
        cursorY += lineHeight;
      }
      cursorY += options.gapAfter ?? 0;
    };

    writeText("Customer problems worth solving", {
      size: 20,
      bold: true,
      gapAfter: 1,
    });
    writeText(
      `${findings.length} ${findings.length === 1 ? "finding" : "findings"} · Exported ${new Date().toLocaleDateString()}`,
      { size: 10, color: 110, gapAfter: 8 },
    );

    findings.forEach((finding, findingIndex) => {
      // Keep a finding's title from being stranded at the bottom of a page.
      const findingStartsNewPage = cursorY + 38 > pageHeight - PAGE_MARGIN;
      if (findingStartsNewPage) {
        pdf.addPage();
        cursorY = PAGE_MARGIN;
      } else if (findingIndex > 0) {
        // Divide findings that share a page.
        pdf.setDrawColor(225);
        pdf.line(PAGE_MARGIN, cursorY, pageWidth - PAGE_MARGIN, cursorY);
        cursorY += 8;
      }
      writeText(finding.title, { size: 14, bold: true, gapAfter: 1.5 });

      const metaParts = [formatOpportunity(finding.feasibility)];
      if (finding.source_upvotes != null)
        metaParts.push(`${finding.source_upvotes} upvotes`);
      if (finding.source_comments != null)
        metaParts.push(`${finding.source_comments} comments`);
      writeText(metaParts.join(" · "), { size: 9, color: 110, gapAfter: 3 });

      writeText(finding.description, { size: 10.5, color: 60, gapAfter: 4 });
      writeText("What people are saying", {
        size: 10.5,
        bold: true,
        gapAfter: 1,
      });
      writeText(finding.sentiment, { size: 10.5, color: 60, gapAfter: 3 });

      if (finding.source_url) {
        const linkSize = 9.5;
        ensureSpace(linkSize * LINE_HEIGHT_RATIO);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(linkSize);
        pdf.setTextColor(63, 94, 194);
        pdf.textWithLink(
          "Check source",
          PAGE_MARGIN,
          cursorY + linkSize * LINE_HEIGHT_RATIO * 0.8,
          {
            url: finding.source_url,
          },
        );
        cursorY += linkSize * LINE_HEIGHT_RATIO + 2;
      }
    });

    pdf.save(buildFileName("pdf"));
  },

  async exportFile(format: FileExportFormat, findings: FindingDataProps[]) {
    if (findings.length === 0) {
      throw new Error("There are no findings to export yet.");
    }
    if (format === "CSV") {
      this.exportCsv(findings);
    } else {
      await this.exportPdf(findings);
    }
  },
};
