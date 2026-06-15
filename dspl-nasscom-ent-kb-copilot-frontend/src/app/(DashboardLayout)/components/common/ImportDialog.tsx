import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Typography,
  IconButton,
  Box,
  Alert,
} from '@mui/material';
import { CloudUpload, Close } from '@mui/icons-material';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

const ImportDialog: React.FC<ImportDialogProps> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [importedQuestions, setImportedQuestions] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Handle CSV import
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null); // Reset any previous error

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').slice(1); // Skip header row
      const questions = rows.filter(row => row.trim() !== "" && row.includes(","));
      setTotalQuestions(questions.length); // Set total questions to import

      // Simulate import process
      questions.forEach((_, index) => {
        setTimeout(() => {
          setImportedQuestions(index + 1); // Increment imported questions
        }, index * 200); // Simulate delay for each import
      });

      // Simulate successful completion after all questions are imported
      setTimeout(() => {
        setLoading(false);
        onClose(); // Close the dialog after import is complete
      }, questions.length * 200); // Adjust based on the number of questions

      // Uncomment below to simulate an error during import
      // setTimeout(() => {
      //   setError("An error occurred while importing the file.");
      //   setLoading(false);
      // }, 1000); // Simulate error after 1 second
    };
    reader.onerror = () => {
      setError("An error occurred while reading the file.");
      setLoading(false);
    };
    reader.readAsText(file);
  };

  // Handle CSV template download
  const downloadCsvTemplate = () => {
    const csvContent = [
      "Question,Option 1,Option 2,Option 3,Option 4,Correct Option Index",
      "What is the capital of France?,Paris,London,Berlin,Madrid,0",
      "What is 2 + 2?,3,4,5,6,1",
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "questions_template.csv";
    link.click();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Bulk Import Questions</Typography>
        <IconButton onClick={onClose}><Close /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            You can import questions using a CSV file. Please ensure the file follows the correct format.
          </Typography>

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Buttons for CSV actions */}
          <Button variant="outlined" component="label" startIcon={<CloudUpload />} sx={{ mr: 2 }}>
            Bulk Import CSV
            <input type="file" hidden accept=".csv" onChange={handleCsvImport} />
          </Button>

          <Button variant="outlined" color="primary" onClick={downloadCsvTemplate}>
            Download CSV Template
          </Button>

          {/* Progress Bar */}
          {loading && (
            <>
              <LinearProgress variant="determinate" value={(importedQuestions / totalQuestions) * 100} sx={{ mt: 2 }} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                {importedQuestions} of {totalQuestions} questions imported
              </Typography>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportDialog;
