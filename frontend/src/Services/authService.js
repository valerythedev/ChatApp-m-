import axios from "axios";

const API = "http://localhost:5550/api/auth";

export const calculateAge = (dob) => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

export const signup = async (form) => {
  const { dateOfBirth, ...rest } = form;
  const age = calculateAge(dateOfBirth);

  if (age < 16) throw new Error("You must be at least 16 years old.");

  const res = await axios.post(`${API}/signup`, {
    ...rest,
    age,
  });

  return res.data;
};

export const login = async ({ username, password }) => {
  const res = await axios.post(`${API}/login`, { username, password });

  localStorage.setItem("token", res.data.token);
  localStorage.setItem("user", JSON.stringify(res.data.user));

  return res.data;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const signupAndLogin = async (form) => {
  await signup(form);
  return await login({ username: form.username, password: form.password });
};
