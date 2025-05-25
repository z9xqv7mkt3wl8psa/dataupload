'use client';

import React, { useState } from 'react';
import { db } from '../../firebase';
import {
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

import * as XLSX from 'xlsx';

import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Snackbar,
} from '@mui/material';

function generateSimpleToken(length = 30) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function downloadTokenExcel(originalData: any[], tokens: { internId: string; token: string }[], collection: string, baseLink: string) {
  const tokenMap = new Map(tokens.map(t => [t.internId, t.token]));

  const fullDataWithTokens = originalData.map(row => {
    const token = tokenMap.get(row['Intern ID']) || '';
    return {
      ...row,
      Token: token,
      'Verification Link': `${baseLink}?token=${token}`
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(fullDataWithTokens);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Intern Data + Tokens');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `Intern_Data_With_Tokens_${collection}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

const requiredColumns = [
  'Full Name',
  'Gender',
  'Father Name',
  'College Name',
  'Internship Duration',
  'Domain of the Internship',
  'Type of Internship',
  'Your assigned Full Project Name',
  'Intern ID',
];

export default function UploadPage() {
  const [fileData, setFileData] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [verificationBaseUrl, setVerificationBaseUrl] = useState('');
  const [tokens, setTokens] = useState<{ internId: string; token: string }[]>([]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSuccessMsg('');
    setTokens([]);
    setWarnings([]);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      setFileData(jsonData);

      if (jsonData.length === 0) {
        setWarnings(['Excel file is empty or unreadable']);
        return;
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUpload = async () => {
    setUploading(true);
    setSuccessMsg('');
    setTokens([]);
    setWarnings([]);

    if (!collectionName.trim()) {
      setWarnings(['Please enter a collection name']);
      setUploading(false);
      return;
    }

    if (!verificationBaseUrl.trim()) {
      setWarnings(['Please enter a verification base URL']);
      setUploading(false);
      return;
    }

    if (fileData.length === 0) {
      setWarnings(['No Excel data to upload']);
      setUploading(false);
      return;
    }

    try {
      const newTokens: { internId: string; token: string }[] = [];
      const colRef = collection(db, collectionName.trim());

      for (const row of fileData) {
        const token = generateSimpleToken(24);
        const docData = {
          ...row,
          token,
          createdAt: serverTimestamp(),
        };
        await addDoc(colRef, docData);
        newTokens.push({ internId: row['Intern ID'], token });
      }

      setTokens(newTokens);
      setSuccessMsg(`Uploaded ${newTokens.length} records to "${collectionName.trim()}" successfully!`);

      // Auto-download Excel
      downloadTokenExcel(fileData, newTokens, collectionName.trim(), verificationBaseUrl.trim());
    } catch (err) {
      setWarnings(['Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error')]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 900, margin: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Upload Intern Data Excel
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">Enter Firestore Collection Name:</Typography>
        <input
          type="text"
          value={collectionName}
          onChange={e => setCollectionName(e.target.value)}
          placeholder="e.g., certificates_verify"
          style={{ padding: 8, fontSize: 16, width: '100%', marginTop: 6 }}
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">Enter Base Verification URL:</Typography>
        <input
          type="text"
          value={verificationBaseUrl}
          onChange={e => setVerificationBaseUrl(e.target.value)}
          placeholder="e.g., https://prasunet.com/certificate"
          style={{ padding: 8, fontSize: 16, width: '100%', marginTop: 6 }}
        />
      </Box>

      <Box mt={2} mb={1}>
        <Typography variant="body2" sx={{ color: '#d32f2f' }}>
          ⚠️ Please ensure the following columns are present in your Excel:
          {` ${requiredColumns.join(', ')}`}
        </Typography>
      </Box>

      <input type="file" accept=".xlsx, .xls" onChange={handleFile} />

      {fileData.length > 0 && (
        <Box mt={3} component={Paper} sx={{ maxHeight: 300, overflowY: 'auto' }}>
          <Typography variant="h6" sx={{ p: 1 }}>
            Excel Preview ({fileData.length} rows)
          </Typography>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {Object.keys(fileData[0]).map((col) => (
                  <TableCell key={col} sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {fileData.map((row, idx) => (
                <TableRow key={idx} hover>
                  {Object.keys(row).map((col) => (
                    <TableCell key={col}>{row[col]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      <Box mt={3} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          disabled={uploading || fileData.length === 0 || !collectionName.trim() || !verificationBaseUrl.trim()}
        >
          {uploading ? <CircularProgress size={24} color="inherit" /> : 'Upload to Firestore'}
        </Button>
      </Box>

      {warnings.length > 0 && (
        <Box mt={2}>
          {warnings.map((w, i) => (
            <Alert severity="warning" key={i} sx={{ mb: 1 }}>
              {w}
            </Alert>
          ))}
        </Box>
      )}

      {successMsg && (
        <Snackbar
          open={true}
          autoHideDuration={6000}
          onClose={() => setSuccessMsg('')}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="success" onClose={() => setSuccessMsg('')} sx={{ width: '100%' }}>
            {successMsg}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
}
