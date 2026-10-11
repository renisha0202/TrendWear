import { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const fields = [
  "fullName",
  "email",
  "mobile",
  "address",
  "state",
  "city",
  "pinCode",
];

const initialValues = {
  fullName: "",
  email: "",
  mobile: "",
  address: "",
  state: "",
  city: "",
  pinCode: "",
};

function validateField(field, value) {
  const trimmedValue = value.trim();

  if (!trimmedValue) return "This field is required.";

  if (field === "fullName") {
    return /^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u.test(trimmedValue) && trimmedValue.length >= 2
      ? ""
      : "Enter a name using letters only.";
  }

  if (field === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedValue)
      ? ""
      : "Enter a valid email address.";
  }

  if (field === "mobile") {
    return /^[6-9]\d{9}$/.test(trimmedValue)
      ? ""
      : "Enter a valid 10-digit Indian mobile number.";
  }

  if (field === "address") {
    return trimmedValue.length >= 10 && /[\p{L}\p{N}]/u.test(trimmedValue)
      ? ""
      : "Enter a complete address of at least 10 characters.";
  }

  if (field === "state" || field === "city") {
    return /^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u.test(trimmedValue)
      ? ""
      : `Enter a valid ${field}.`;
  }

  if (field === "pinCode") {
    return /^\d{6}$/.test(trimmedValue)
      ? ""
      : "PIN Code must contain exactly 6 digits.";
  }

  return "";
}

function Checkout() {
  const location = useLocation();
  const product = location.state?.product;
  const hasProduct =
    product &&
    product.id != null &&
    typeof product.name === "string" &&
    product.name.trim() &&
    typeof product.image === "string" &&
    product.image.trim() &&
    Number.isFinite(product.price) &&
    product.price >= 0;
  const quantity = Math.max(1, Math.floor(Number(location.state?.quantity) || 1));
  const [form, setForm] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const submissionGuard = useRef(false);

  const updateField = (field, value) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: validateField(field, value),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (submissionGuard.current || !hasProduct) return;

    const nextErrors = Object.fromEntries(
      fields
        .map((field) => [field, validateField(field, form[field])])
        .filter(([, error]) => error)
    );
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    submissionGuard.current = true;
    setSubmitted(true);
  };

  const renderField = (field, label, placeholder, type = "text", fullWidth = false) => {
    const errorId = `${field}-error`;
    const fieldClass = `checkout-field${fullWidth ? " checkout-field-full" : ""}`;

    return (
      <div className={fieldClass} key={field}>
        <label htmlFor={field}>
          {label} <span className="required-mark" aria-hidden="true">*</span>
          <span className="sr-only"> required</span>
        </label>
        {field === "address" ? (
          <textarea
            id={field}
            name={field}
            value={form[field]}
            placeholder={placeholder}
            required
            disabled={submitted}
            aria-required="true"
            aria-invalid={Boolean(errors[field])}
            aria-describedby={errors[field] ? errorId : undefined}
            className={errors[field] ? "field-invalid" : ""}
            autoComplete="street-address"
            onChange={(event) => updateField(field, event.target.value)}
          />
        ) : (
          <input
            id={field}
            name={field}
            type={type}
            value={form[field]}
            placeholder={placeholder}
            required
            disabled={submitted}
            aria-required="true"
            aria-invalid={Boolean(errors[field])}
            aria-describedby={errors[field] ? errorId : undefined}
            className={errors[field] ? "field-invalid" : ""}
            autoComplete={
              field === "fullName" ? "name" :
              field === "email" ? "email" :
              field === "mobile" ? "tel" :
              field === "state" ? "address-level1" :
              field === "city" ? "address-level2" :
              field === "pinCode" ? "postal-code" : undefined
            }
            inputMode={field === "mobile" || field === "pinCode" ? "numeric" : undefined}
            onChange={(event) => updateField(field, event.target.value)}
          />
        )}
        {errors[field] && <p className="field-error" id={errorId}>{errors[field]}</p>}
      </div>
    );
  };

  if (!hasProduct) {
    return (
      <main className="section checkout-page">
        <p className="eyebrow dark-eyebrow">SECURE YOUR SELECTION</p>
        <h1>Checkout</h1>
        <p className="checkout-empty">A product was not selected or its details are unavailable. Choose a product to start checkout.</p>
        <Link to="/shop" className="btn btn-dark">Return to Shop <span>↗</span></Link>
      </main>
    );
  }

  const subtotal = product.price * quantity;

  return (
    <main className="section checkout-page">
      <p className="eyebrow dark-eyebrow">ONE CONSIDERED PIECE</p>
      <h1>Checkout.</h1>

      <div className="checkout-layout">
        <form className="checkout-form" noValidate onSubmit={handleSubmit}>
          {renderField("fullName", "Full Name", "e.g. Aanya Sharma")}
          {renderField("email", "Email Address", "you@example.com", "email")}
          {renderField("mobile", "Mobile Number", "10-digit Indian mobile number", "tel")}
          {renderField("pinCode", "PIN Code", "6-digit PIN", "text")}
          {renderField("address", "Address", "House number, street, area", "text", true)}
          {renderField("state", "State", "e.g. Maharashtra")}
          {renderField("city", "City", "e.g. Mumbai")}
          <button className="btn btn-dark place-order-btn" type="submit" disabled={submitted}>
            {submitted ? "Details Submitted" : "Place Order"}
            {!submitted && <span aria-hidden="true">↗</span>}
          </button>
          {submitted && (
            <p className="checkout-success" role="status">
              Your order details have been submitted successfully! This is a frontend demo; no payment was processed and no order was saved.
            </p>
          )}
        </form>

        <aside className="order-summary" aria-label="Order summary">
          <h2>Order Summary</h2>
          <div className="checkout-product">
            <img src={product.image} alt={product.name} />
            <div>
              <h3>{product.name}</h3>
              <p>Unit price: ₹{product.price.toLocaleString("en-IN")}</p>
              <p>Quantity: {quantity}</p>
            </div>
          </div>
          <div className="checkout-totals">
            <p><span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span></p>
            <p className="checkout-final-total"><strong>Total</strong><strong>₹{subtotal.toLocaleString("en-IN")}</strong></p>
          </div>
          <p className="checkout-demo-note">No additional charges are applied. Payment is not collected on this demo checkout.</p>
        </aside>
      </div>
    </main>
  );
}

export default Checkout;