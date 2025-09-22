const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const xlsx = require("xlsx");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let applicants = [];

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Parse PDF
async function parsePDF(buffer) {
  const data = await pdfParse(buffer);
  return data.text;
}

// Parse Word
async function parseWord(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// Parse Excel
function parseExcel(buffer) {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet);
}

// Upload CV (PDF/Word)
app.post("/upload/cv", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    let text = "";
    if (req.file.mimetype === "application/pdf") {
      text = await parsePDF(req.file.buffer);
    } else {
      text = await parseWord(req.file.buffer);
    }

    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);

    const applicant = {
      name: "Extract Name Later",
      email: emailMatch ? emailMatch[0] : "Not found",
      phone: "Not parsed",
      currentCompany: "Not parsed",
      skills: "Not parsed",
      experience: "Not parsed",
    };

    applicants.push(applicant);
    res.json({ message: "CV parsed successfully", applicant });
  } catch (err) {
    res.status(500).json({ error: "Error parsing CV" });
  }
});

// Upload Excel
app.post("/upload/excel", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const rows = parseExcel(req.file.buffer);
    rows.forEach((row) =>
      applicants.push({
        name: row.Name || "Unknown",
        email: row.Email || "Not found",
        phone: row.Phone || "Not found",
        currentCompany: row.Company || "Not parsed",
        skills: row.Skills || "Not parsed",
        experience: row.Experience || "Not parsed",
      })
    );
    res.json({ message: "Excel parsed successfully", applicants: rows });
  } catch (err) {
    res.status(500).json({ error: "Error parsing Excel" });
  }
});

// Get applicants
app.get("/applicants", (req, res) => {
  res.json(applicants);
});

// Start server
app.listen(PORT, () => {
  console.log(`ATS backend running on port ${PORT}`);
});
