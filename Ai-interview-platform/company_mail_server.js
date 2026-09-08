import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app  = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// ─── HR Database Proxy Endpoints ──────────────────────────────────────────────
// These proxy calls to the .NET Company API (port 5263).
// Email functionality has been moved to server.js + src/services/emailService.js

app.get('/api/hr/exists', async (req, res) => {
  const { email } = req.query;
  try {
    const response = await axios.get(
      `http://localhost:5263/api/HR/exists?email=${encodeURIComponent(email)}`
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error checking HR status:', error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to check HR status' });
  }
});

app.post('/api/hr/register', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:5263/api/HR/register', req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Error registering HR:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Failed to register HR'
    });
  }
});

app.get('/api/hr/list/:companyId', async (req, res) => {
  const { companyId } = req.params;
  try {
    const response = await axios.get(
      `http://localhost:5263/api/HR/company/${companyId}`
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching HR list:', error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch HR list' });
  }
});

app.listen(PORT, () => {
  console.log(`[company_mail_server.js] HR proxy running on http://localhost:${PORT}`);
});
