import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";

import logo from "../../assets/logo.png";
import * as auth from "../../api/auth";
import { extractErrorMessage } from "../../api/client";
import "./Register.css";

function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        employeeNumber: "",
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        verifyPassword: "",
        acceptedTerms: false,
        popiaConsentGranted: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showVerifyPassword, setShowVerifyPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    function handleInputChange(event) {
        const { name, value, type, checked } = event.target;

        setFormData((currentFormData) => ({
            ...currentFormData,
            [name]: type === "checkbox" ? checked : value,
        }));

        if (errorMessage) {
            setErrorMessage("");
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const employeeNumber = formData.employeeNumber.trim();
        const firstName = formData.firstName.trim();
        const lastName = formData.lastName.trim();
        const email = formData.email.trim();

        if (
            !employeeNumber ||
            !firstName ||
            !lastName ||
            !email ||
            !formData.password ||
            !formData.verifyPassword
        ) {
            setErrorMessage("Please complete all the required fields.");
            return;
        }

        if (formData.password !== formData.verifyPassword) {
            setErrorMessage("The passwords do not match.");
            return;
        }

        if (!formData.acceptedTerms) {
            setErrorMessage(
                "Please agree to the Terms of Service and Privacy Policy.",
            );
            return;
        }

        setIsSubmitting(true);
        setErrorMessage("");

        try {
            await auth.createUser({
                employeeNumber,
                firstName,
                lastName,
                email,
                password: formData.password,
                role: "Employee",
                isActive: true,
                popiaConsentGranted: formData.popiaConsentGranted,
            });

            navigate("/login", { replace: true });
        } catch (error) {
            setErrorMessage(extractErrorMessage(error, "Unable to create your account. Please try again."));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="register-page">
            <section className="register-brand-section">
                <img
                    className="register-logo"
                    src={logo}
                    alt="Clock It - Authenticate, Secure, Trust"
                />
            </section>

            <section className="register-form-section">
                <div className="register-form-container">
                    <header className="register-header">
                        <h1>Create Your Account</h1>

                        <p>
                            Already have one? <Link to="/login">Sign In</Link>
                        </p>
                    </header>

                    <form className="register-form" onSubmit={handleSubmit} noValidate>
                        <div className="register-form-group">
                            <label htmlFor="employeeNumber">Employee number</label>

                            <input
                                id="employeeNumber"
                                name="employeeNumber"
                                type="text"
                                value={formData.employeeNumber}
                                onChange={handleInputChange}
                                autoComplete="off"
                                required
                            />
                        </div>

                        <div className="register-form-group">
                            <label htmlFor="firstName">First name</label>

                            <input
                                id="firstName"
                                name="firstName"
                                type="text"
                                value={formData.firstName}
                                onChange={handleInputChange}
                                autoComplete="given-name"
                                required
                            />
                        </div>

                        <div className="register-form-group">
                            <label htmlFor="lastName">Last name</label>

                            <input
                                id="lastName"
                                name="lastName"
                                type="text"
                                value={formData.lastName}
                                onChange={handleInputChange}
                                autoComplete="family-name"
                                required
                            />
                        </div>

                        <div className="register-form-group">
                            <label htmlFor="registerEmail">Email</label>

                            <input
                                id="registerEmail"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div className="register-form-group">
                            <label htmlFor="registerPassword">Password</label>

                            <div className="register-password-wrapper">
                                <input
                                    id="registerPassword"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    autoComplete="new-password"
                                    required
                                />

                                <button
                                    className="register-password-toggle"
                                    type="button"
                                    onClick={() =>
                                        setShowPassword((currentValue) => !currentValue)
                                    }
                                    aria-label={
                                        showPassword ? "Hide password" : "Show password"
                                    }
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>

                        <div className="register-form-group verify-password-group">
                            <label htmlFor="verifyPassword">Verify Password</label>

                            <div className="register-password-wrapper">
                                <input
                                    id="verifyPassword"
                                    name="verifyPassword"
                                    type={showVerifyPassword ? "text" : "password"}
                                    value={formData.verifyPassword}
                                    onChange={handleInputChange}
                                    autoComplete="new-password"
                                    required
                                />

                                <button
                                    className="register-password-toggle"
                                    type="button"
                                    onClick={() =>
                                        setShowVerifyPassword((currentValue) => !currentValue)
                                    }
                                    aria-label={
                                        showVerifyPassword
                                            ? "Hide verified password"
                                            : "Show verified password"
                                    }
                                    title={
                                        showVerifyPassword
                                            ? "Hide verified password"
                                            : "Show verified password"
                                    }
                                >
                                    {showVerifyPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>

                            <p className="password-requirement">
                                Use 8+ characters with a number and a symbol.
                            </p>
                        </div>

                        <label className="terms-checkbox">
                            <input
                                name="acceptedTerms"
                                type="checkbox"
                                checked={formData.acceptedTerms}
                                onChange={handleInputChange}
                            />

                            <span>
                                I agree to the{" "}
                                <a href="/terms" onClick={(event) => event.preventDefault()}>
                                    Terms of service
                                </a>{" "}
                                and{" "}
                                <a href="/privacy" onClick={(event) => event.preventDefault()}>
                                    Privacy policy
                                </a>
                                .
                            </span>
                        </label>

                        <label className="terms-checkbox">
                            <input
                                name="popiaConsentGranted"
                                type="checkbox"
                                checked={formData.popiaConsentGranted}
                                onChange={handleInputChange}
                            />

                            <span>
                                I consent to the capture and storage of my biometric data for attendance
                                verification, in accordance with POPIA.
                            </span>
                        </label>

                        {errorMessage && (
                            <p className="register-error-message" role="alert">
                                {errorMessage}
                            </p>
                        )}

                        <button className="create-account-button" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Creating account..." : "Create Account"}
                        </button>
                    </form>
                </div>
            </section>
        </main>
    );
}

export default Register;