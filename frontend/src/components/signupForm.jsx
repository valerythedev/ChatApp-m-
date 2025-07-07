import { useState } from "react";

function SignupForm({ onSubmit }) {
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="w-full max-w-sm mx-auto overflow-hidden bg-white rounded-lg shadow-md   dark:bg-zinc-900">
      <div className="px-6 py-4">
        <div className="flex justify-center mx-auto">
          <img
            className="w-auto h-10"
            src="/ChatBx.svg"
            alt="ChatBox Logo"
          />
        </div>

        <h3 className="mt-3 text-xl font-medium text-center text-zinc-600 dark:text-zinc-200">
          Create Account
        </h3>
        <p className="mt-1 text-center text-zinc-500 dark:text-zinc-400">
          Fill in your details
        </p>

        <form onSubmit={handleSubmit}>
          <div className="w-full mt-4">
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              type="text"
              placeholder="Full Name"
              className="block w-full px-4 py-2 mt-2 text-zinc-700 placeholder-zinc-500 bg-white border rounded-lg dark:bg-zinc-800 dark:border-zinc-600 dark:placeholder-zinc-400 focus:border-neutral-500 focus:ring-opacity-40 focus:outline-none focus:ring focus:ring-neutral-300"
            />
          </div>

          <div className="w-full mt-4">
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              type="text"
              placeholder="Username"
              className="block w-full px-4 py-2 mt-2 text-zinc-700 placeholder-zinc-500 bg-white border rounded-lg dark:bg-zinc-800 dark:border-zinc-600 dark:placeholder-zinc-400 focus:border-neutral-500 focus:ring-opacity-40 focus:outline-none focus:ring focus:ring-neutral-300"
            />
          </div>

          <div className="w-full mt-4">
            <input
              name="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={handleChange}
              className="block w-full px-4 py-2 mt-2 text-zinc-700 placeholder-zinc-500 bg-white border rounded-lg dark:bg-zinc-800 dark:border-zinc-600 dark:placeholder-zinc-400 focus:border-neutral-500 focus:ring-opacity-40 focus:outline-none focus:ring focus:ring-neutral-300"
            />
          </div>

          <div className="w-full mt-4">
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              className="block w-full px-4 py-2 mt-2 text-zinc-700 placeholder-zinc-500 bg-white border rounded-lg dark:bg-zinc-800 dark:border-zinc-600 dark:placeholder-zinc-400 focus:border-neutral-500 focus:ring-opacity-40 focus:outline-none focus:ring focus:ring-neutral-300"
            />
          </div>

          <div className="w-full mt-4">
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm Password"
              className="block w-full px-4 py-2 mt-2 text-zinc-700 placeholder-zinc-500 bg-white border rounded-lg dark:bg-zinc-800 dark:border-zinc-600 dark:placeholder-zinc-400 focus:border-neutral-500 focus:ring-opacity-40 focus:outline-none focus:ring focus:ring-neutral-300"
            />
          </div>

          <div className="flex items-center justify-between mt-4">
            <button
              type="submit"
              className="w-full px-6 py-2 text-sm font-medium tracking-wide text-stone-900 capitalize transition-colors duration-300 transform bg-stone-300 rounded-lg hover:bg-neutral-500 focus:outline-none focus:ring focus:ring-neutral-300 focus:ring-opacity-50"
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>

      <div className="flex items-center justify-center py-4 text-center bg-zinc-50 dark:bg-zinc-700">
        <span className="text-sm text-zinc-600 dark:text-zinc-200">
          Already have an account?
        </span>
        <a
          href="/"
          className="mx-2 text-sm font-bold text-white dark:text-grey-900 hover:underline"
        >
          Login
        </a>
      </div>
    </div>
  );
}

export default SignupForm;
