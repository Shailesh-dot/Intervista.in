import axios from 'axios';

const API_BASE_URL = '/api/communication/api/v1';

const communicationApi = axios.create({
  baseURL: API_BASE_URL,
});

export const getSpeakingQuestions = async (interviewId = null) => {
  const url = interviewId ? `/speaking/questions?interview_id=${interviewId}` : '/speaking/questions';
  const response = await communicationApi.get(url);
  return response.data;
};

export const evaluateSpeakingClip = async (sessionId, questionIndex, audioBlob) => {
  const formData = new FormData();
  formData.append('session_id', sessionId);
  formData.append('question_index', questionIndex);
  formData.append('audio', audioBlob, `q${questionIndex}.wav`);

  const response = await communicationApi.post('/evaluate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getListeningClips = async (interviewId = null) => {
  const url = interviewId ? `/listening/clips?interview_id=${interviewId}` : '/listening/clips';
  const response = await communicationApi.get(url);
  return response.data;
};

export const submitListeningResponse = async (sessionId, clipId, audioBlob, questionIndex = 0) => {
  const formData = new FormData();
  formData.append('session_id', sessionId);
  formData.append('clip_id', clipId);
  formData.append('question_index', questionIndex);
  formData.append('audio', audioBlob, `${clipId}_response.wav`);

  const response = await communicationApi.post('/listening/respond', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const submitAllListeningResponses = async (sessionId, audioFiles) => {
  const formData = new FormData();
  formData.append('session_id', sessionId);

  if (audioFiles.clip_1) formData.append('clip_1_q1', audioFiles.clip_1);
  if (audioFiles.clip_2) formData.append('clip_2_q1', audioFiles.clip_2);
  if (audioFiles.clip_3) formData.append('clip_3_q1', audioFiles.clip_3);
  if (audioFiles.clip_4) formData.append('clip_4_q1', audioFiles.clip_4);

  const response = await communicationApi.post('/listening/respond_all', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const aggregateSpeakingScore = async (clipResults) => {
  const response = await communicationApi.post('/speaking/aggregate', clipResults);
  return response.data;
};

export const aggregateListeningScore = async (clipResults, sessionId = null) => {
  const url = sessionId ? `/listening/aggregate?session_id=${sessionId}` : '/listening/aggregate';
  const response = await communicationApi.post(url, clipResults);
  return response.data;
};

export default communicationApi;
