/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from "jspdf";
import { FalloCase, StudentFicha } from "../types";

export function generateAcademicPDF(ficha: StudentFicha, caseData: FalloCase, studentName: string): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Color Palette Definitions
  const PrimaryBordeaux = [128, 0, 32]; // Academic Bordeaux (#800020)
  const DarkCharcoal = [40, 40, 40];
  const LightGray = [220, 220, 220];
  const CreamBG = [252, 246, 244];

  // Helper function to draw section headers
  const drawSecHeader = (title: string, yPos: number) => {
    doc.setFillColor(PrimaryBordeaux[0], PrimaryBordeaux[1], PrimaryBordeaux[2]);
    doc.rect(15, yPos, 180, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), 18, yPos + 5);
  };

  // Helper to draw label-value block with height calculation
  const drawTextBlock = (label: string, text: string, y: number, height: number = 0, width: number = 180): number => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(PrimaryBordeaux[0], PrimaryBordeaux[1], PrimaryBordeaux[2]);
    doc.text(label.toUpperCase(), 17, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(DarkCharcoal[0], DarkCharcoal[1], DarkCharcoal[2]);
    const wrappedText = doc.splitTextToSize(text || "—", width - 6);
    doc.text(wrappedText, 17, y + 4.5);
    
    return y + 5 + (wrappedText.length * 4.2) + 2; // Returns final Y coordinate
  };

  // --- PAGE 1 ---
  doc.setFillColor(CreamBG[0], CreamBG[1], CreamBG[2]);
  doc.rect(0, 0, 10, 297, "F");

  // Header
  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(PrimaryBordeaux[0], PrimaryBordeaux[1], PrimaryBordeaux[2]);
  doc.text("CÁTEDRA DERECHO CONSTITUCIONAL C | UNT 2026", 15, 15);

  doc.setDrawColor(PrimaryBordeaux[0], PrimaryBordeaux[1], PrimaryBordeaux[2]);
  doc.setLineWidth(0.5);
  doc.line(15, 17, 195, 17);

  // Main Title
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(PrimaryBordeaux[0], PrimaryBordeaux[1], PrimaryBordeaux[2]);
  doc.text("Modelo de ficha de jurisprudencia", 15, 26);

  // Student details metadata box
  doc.setFillColor(248, 248, 248);
  doc.rect(15, 30, 180, 22, "F");
  doc.setDrawColor(LightGray[0], LightGray[1], LightGray[2]);
  doc.setLineWidth(0.2);
  doc.rect(15, 30, 180, 22, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(DarkCharcoal[0], DarkCharcoal[1], DarkCharcoal[2]);
  doc.text("ESTUDIANTE:", 18, 36);
  doc.text("LEGAJO / CURSADA:", 18, 41);
  doc.text("FECHA EXPORTACIÓN:", 18, 46);

  doc.setFont("helvetica", "normal");
  doc.text(studentName.toUpperCase(), 50, 36);
  doc.text(ficha.username.toUpperCase(), 50, 41);
  doc.text(new Date().toLocaleDateString("es-AR") + " " + new Date().toLocaleTimeString("es-AR"), 50, 46);

  doc.text("ESTADO DE COMPLETITUD: IA Socrático Certificado", 110, 36);

  // Build Section 1: Identificación y Fallo Inicial
  let y = 57;
  drawSecHeader("1. Datos Generales del Fallo", y);
  y += 12;

  // NOMBRE DEL FALLO
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(PrimaryBordeaux[0], PrimaryBordeaux[1], PrimaryBordeaux[2]);
  doc.text("NOMBRE DEL FALLO:", 17, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(DarkCharcoal[0], DarkCharcoal[1], DarkCharcoal[2]);
  const parsedNombre = ficha.nombreDelFallo && ficha.nombreDelFallo !== "—" ? ficha.nombreDelFallo : caseData.title;
  doc.text(parsedNombre, 57, y);
  y += 7;

  // Fallos & Año
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(PrimaryBordeaux[0], PrimaryBordeaux[1], PrimaryBordeaux[2]);
  doc.text("FALLOS:", 17, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(ficha.fallos || "—", 32, y);

  doc.setFont("helvetica", "bold");
  doc.text("AÑO:", 100, y);
  doc.setFont("helvetica", "normal");
  doc.text(ficha.ano && ficha.ano !== "—" ? ficha.ano : String(caseData.year), 112, y);
  y += 9;

  // Hechos
  y = drawTextBlock("Hechos", ficha.hechos && ficha.hechos !== "—" ? ficha.hechos : (caseData.coreFacts || "—"), y);

  // Cuestiones Presentadas
  y = drawTextBlock("Cuestiones presentadas", ficha.cuestionesPresentadas || "—", y);

  // Primera Instancia
  y = drawTextBlock("Primera instancia", ficha.primeraInstancia || "—", y);

  // Segunda Instancia
  y = drawTextBlock("Segunda instancia", ficha.segundaInstancia || "—", y);

  // Tipo Jurisdicción
  drawTextBlock("Tipo de jurisdicción invocada para acceder a la Corte Suprema", ficha.tipoJurisdiccionInvocada || "—", y);

  const drawPageFooter = (pageNum: number) => {
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`CONSTI-BOT Cátedra C | Modelo Digitalizado UNT | Página ${pageNum} de 2`, 15, 287);
  };
  drawPageFooter(1);

  // --- PAGE 2 ---
  doc.addPage();
  doc.setFillColor(CreamBG[0], CreamBG[1], CreamBG[2]);
  doc.rect(0, 0, 10, 297, "F");

  // Header Page 2
  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(PrimaryBordeaux[0], PrimaryBordeaux[1], PrimaryBordeaux[2]);
  doc.text("CÁTEDRA DERECHO CONSTITUCIONAL C | UNT 2026", 15, 15);
  doc.setDrawColor(PrimaryBordeaux[0], PrimaryBordeaux[1], PrimaryBordeaux[2]);
  doc.setLineWidth(0.5);
  doc.line(15, 17, 195, 17);

  y = 24;
  drawSecHeader("2. Estructura de Opiniones y Fundamentos", y);
  y += 11;

  // OPINION DEL PROCURADOR GENERAL
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(PrimaryBordeaux[0], PrimaryBordeaux[1], PrimaryBordeaux[2]);
  doc.text("OPINIÓN DEL PROCURADOR GENERAL", 17, y);
  y += 5;
  y = drawTextBlock("Principios elaborados", ficha.procuradorGeneral_principios || "—", y, 0, 180);
  y = drawTextBlock("Razonamiento", ficha.procuradorGeneral_razonamiento || "—", y, 0, 180);
  y += 3;

  // DECISION DE LA CORTE SUPREMA
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(PrimaryBordeaux[0], PrimaryBordeaux[1], PrimaryBordeaux[2]);
  doc.text("DECISIÓN DE LA CORTE SUPREMA", 17, y);
  y += 5;
  y = drawTextBlock("Principios elaborados", ficha.decisionCorte_principios || "—", y, 0, 180);
  y = drawTextBlock("Razonamiento", ficha.decisionCorte_razonamiento || ficha.resolution || "—", y, 0, 180);
  y += 3;

  // DISIDENCIA O CONCURRENCIA
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(PrimaryBordeaux[0], PrimaryBordeaux[1], PrimaryBordeaux[2]);
  doc.text("DISIDENCIA O CONCURRENCIA", 17, y);
  y += 5;
  y = drawTextBlock("Principios elaborados", ficha.disidenciaConcurrencia_principios || "—", y, 0, 180);
  y = drawTextBlock("Razonamiento", ficha.disidenciaConcurrencia_razonamiento || "—", y, 0, 180);
  y += 3;

  // OBITER DICTUM SIGNIFICATIVO
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(PrimaryBordeaux[0], PrimaryBordeaux[1], PrimaryBordeaux[2]);
  doc.text("OBITER DICTUM SIGNIFICATIVO", 17, y);
  y += 5;
  y = drawTextBlock("Obiter dictum significativo", ficha.obiterDictumSignificativo || "—", y, 0, 180);

  // Footer stamp line on page 2
  doc.setDrawColor(PrimaryBordeaux[0], PrimaryBordeaux[1], PrimaryBordeaux[2]);
  doc.setLineWidth(0.3);
  doc.line(15, 275, 195, 275);
  
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(PrimaryBordeaux[0], PrimaryBordeaux[1], PrimaryBordeaux[2]);
  doc.text("CERTIFICACIÓN ACADÉMICA SÓCRATICA DIGITAL - CÁTEDRA DERECHO CONSTITUCIONAL C", 15, 281);

  drawPageFooter(2);

  // Save PDF file
  const fileName = `Ficha_Jurisprudencia_${caseData.id}_${ficha.username}.pdf`;
  doc.save(fileName);
}
