
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useStore } from "../useStore";

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

function validateField(field, value = "") {
  const trimmedValue = String(value).trim();

  if (!trimmedValue) return "This field is required.";

  if (field === "fullName") {
    return /^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u.test(trimmedValue) &&
      trimmedValue.length >= 2
      ? ""
      : "Enter a valid name.";
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
    return trimmedValue.length >= 10 &&
      trimmedValue.length <= 300 &&
      /[\p{L}\p{N}]/u.test(trimmedValue)
      ? ""
      : "Enter a complete address of at least 10 characters.";
  }

  if (field === "state" || field === "city") {
    return trimmedValue.length >= 2 &&
      /^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u.test(trimmedValue)
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

async function openRazorpayCheckout(orderNumber, customer, triggerTestModal) {
  // Create a Razorpay order on the backend linked to this order.
  const response = await api.orders.createRazorpayOrder(orderNumber);
  const data = response?.data;

  if (!data?.razorpayOrderId || !data?.keyId) {
    throw new Error("Unable to create Razorpay payment order.");
  }

  // If in test simulation mode (unconfigured credentials), open the interactive test modal
  if (data.isMock && triggerTestModal) {
    return new Promise((resolve, reject) => {
      triggerTestModal({
        orderNumber,
        amount: data.amount,
        razorpayOrderId: data.razorpayOrderId,
        customer,
        resolve,
        reject,
      });
    });
  }

  if (!window.Razorpay) {
    throw new Error(
      "Razorpay Checkout did not load. Please refresh and try again."
    );
  }

  // Open Razorpay Checkout and wait for its result.
  return new Promise((resolve, reject) => {
    let completed = false;

    const razorpay = new window.Razorpay({
      key: data.keyId,
      amount: data.amount,
      currency: data.currency || "INR",
      order_id: data.razorpayOrderId,
      name: "TrendWear",
      description: `Payment for Order ${orderNumber}`,
      prefill: {
        name: customer.fullName || data.customer?.name,
        email: customer.email || data.customer?.email,
        contact: customer.mobile || data.customer?.contact,
      },
      theme: {
        color: "#111111",
      },

      handler: async (paymentResponse) => {
        try {
          const verifyData = await api.orders.verifyRazorpayPayment({
            orderNumber,
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature,
          });

          completed = true;
          resolve({
            verified: true,
            paymentId: paymentResponse.razorpay_payment_id,
            razorpayOrderId: paymentResponse.razorpay_order_id,
            order: verifyData?.data?.order,
          });
        } catch (error) {
          completed = true;
          reject(error);
        }
      },

      modal: {
        ondismiss: () => {
          if (!completed) {
            completed = true;
            reject(
              new Error(
                "Payment was cancelled or the checkout window was closed."
              )
            );
          }
        },
      },
    });

    razorpay.on("payment.failed", (event) => {
      if (!completed) {
        completed = true;
        reject(
          new Error(
            event.error?.description || "Payment failed. Please try again."
          )
        );
      }
    });

    razorpay.open();
  });
}

function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authLoading, removeFromCart } = useStore();

  const requestedProduct = location.state?.product;

  const [product, setProduct] = useState(null);
  const [productLoading, setProductLoading] = useState(
    Boolean(requestedProduct?.id)
  );
  const [productError, setProductError] = useState("");

  const quantity = Math.max(
    1,
    Math.floor(Number(location.state?.quantity) || 1)
  );

  const [form, setForm] = useState(() => ({
    ...initialValues,
    ...(location.state?.form || {}),
  }));

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [testModal, setTestModal] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("upi");

  const submissionGuard = useRef(false);
  const idempotencyKey = useRef("");

  useEffect(() => {
    let active = true;

    if (!requestedProduct?.id) {
      setProductLoading(false);
      setProductError("A product was not selected.");
      return () => {
        active = false;
      };
    }

    api.catalog
      .product(requestedProduct.id)
      .then((result) => {
        if (active) setProduct(result.data);
      })
      .catch((error) => {
        if (active) setProductError(error.message);
      })
      .finally(() => {
        if (active) setProductLoading(false);
      });

    return () => {
      active = false;
    };
  }, [requestedProduct?.id]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));

    setErrors((current) => ({
      ...current,
      [field]: validateField(field, value),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      submissionGuard.current ||
      submitting ||
      submittedOrder ||
      !product
    ) {
      return;
    }

    const nextErrors = Object.fromEntries(
      fields
        .map((field) => [field, validateField(field, form[field])])
        .filter(([, error]) => error)
    );

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    if (!user) {
      navigate("/account", {
        state: {
          checkout: {
            product,
            quantity,
            fromCart: location.state?.fromCart,
            form,
          },
        },
      });
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      if (!idempotencyKey.current) {
        idempotencyKey.current =
          globalThis.crypto?.randomUUID?.() ||
          `${Date.now()}-${Math.random()}`;
      }

      // Create the existing TrendWear order.
      const result = await api.orders.create(
        {
          items: [{ productId: product.id, quantity }],
          customer: form,
        },
        idempotencyKey.current
      );

      const order = result.data.order;

      if (!order) {
        throw new Error("The order could not be created.");
      }

      // Open Razorpay only after the order request succeeds.
      const payment = await openRazorpayCheckout(
        order.orderNumber,
        form,
        setTestModal
      );

      if (!payment.verified) {
        throw new Error("Payment could not be verified.");
      }

      // Keep the existing order reference and payment details.
      setSubmittedOrder({
        ...(payment.order || order),
        paymentId: payment.paymentId,
        razorpayOrderId: payment.razorpayOrderId,
        paymentVerified: true,
      });

      submissionGuard.current = true;

      if (location.state?.fromCart) {
        await removeFromCart(product.id);
      }
    } catch (error) {
      setSubmitError(error.message || "Unable to complete checkout.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (
    field,
    label,
    placeholder,
    type = "text",
    fullWidth = false
  ) => {
    const errorId = `${field}-error`;
    const fieldClass = `checkout-field${
      fullWidth ? " checkout-field-full" : ""
    }`;

    const commonProps = {
      id: field,
      name: field,
      value: form[field],
      placeholder,
      required: true,
      disabled: Boolean(submittedOrder),
      "aria-required": "true",
      "aria-invalid": Boolean(errors[field]),
      "aria-describedby": errors[field] ? errorId : undefined,
      className: errors[field] ? "field-invalid" : "",
      onChange: (event) => updateField(field, event.target.value),
    };

    return (
      <div className={fieldClass} key={field}>
        <label htmlFor={field}>
          {label} <span className="required-mark" aria-hidden="true">*</span>
          <span className="sr-only"> required</span>
        </label>

        {field === "address" ? (
          <textarea {...commonProps} autoComplete="street-address" />
        ) : (
          <input
            {...commonProps}
            type={type}
            autoComplete={
              field === "fullName"
                ? "name"
                : field === "email"
                  ? "email"
                  : field === "mobile"
                    ? "tel"
                    : field === "state"
                      ? "address-level1"
                      : field === "city"
                        ? "address-level2"
                        : field === "pinCode"
                          ? "postal-code"
                          : undefined
            }
            inputMode={
              field === "mobile" || field === "pinCode"
                ? "numeric"
                : undefined
            }
          />
        )}

        {errors[field] && (
          <p className="field-error" id={errorId}>
            {errors[field]}
          </p>
        )}
      </div>
    );
  };

  if (productLoading) {
    return (
      <main className="section checkout-page">
        <p role="status">Loading selected product…</p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="section checkout-page">
        <p className="eyebrow dark-eyebrow">SECURE YOUR SELECTION</p>
        <h1>Checkout</h1>
        <p className="checkout-empty">
          {productError ||
            "A product was not selected. Choose a product to start checkout."}
        </p>
        <Link to="/shop" className="btn btn-dark">
          Return to Shop <span>↗</span>
        </Link>
      </main>
    );
  }

  const subtotal = Number(product.price) * quantity;

  return (
    <main className="section checkout-page">
      <p className="eyebrow dark-eyebrow">ONE CONSIDERED PIECE</p>
      <h1>Checkout.</h1>

      <div className="checkout-layout">
        <form
          className="checkout-form"
          noValidate
          onSubmit={handleSubmit}
        >
          {renderField("fullName", "Full Name", "e.g. Aanya Sharma")}
          {renderField("email", "Email Address", "you@example.com", "email")}
          {renderField(
            "mobile",
            "Mobile Number",
            "10-digit Indian mobile number",
            "tel"
          )}
          {renderField("pinCode", "PIN Code", "6-digit PIN")}
          {renderField(
            "address",
            "Address",
            "House number, street, area",
            "text",
            true
          )}
          {renderField("state", "State", "e.g. Maharashtra")}
          {renderField("city", "City", "e.g. Mumbai")}

          {submitError && (
            <p className="checkout-error" role="alert">
              {submitError}{" "}
              {!user && (
                <Link
                  to="/account"
                  state={{
                    checkout: {
                      product,
                      quantity,
                      fromCart: location.state?.fromCart,
                      form,
                    },
                  }}
                >
                  Sign in or create an account
                </Link>
              )}
            </p>
          )}

          <button
            className="btn btn-dark place-order-btn"
            type="submit"
            disabled={submitting || Boolean(submittedOrder) || authLoading}
          >
            {submitting
              ? "Processing Payment…"
              : submittedOrder
                ? "Payment Verified"
                : "Place Order"}
            {!submitting && !submittedOrder && (
              <span aria-hidden="true">↗</span>
            )}
          </button>

          {submittedOrder && (
            <p className="checkout-success" role="status">
              Payment successful! Payment ID: {submittedOrder.paymentId}.
              Order #{submittedOrder.orderNumber || submittedOrder._id} has been placed.
            </p>
          )}
        </form>

        <aside className="order-summary" aria-label="Order summary">
          <h2>Order Summary</h2>

          <div className="checkout-product">
            <img src={product.image} alt={product.name} />
            <div>
              <h3>{product.name}</h3>
              <p>
                Unit price: ₹{Number(product.price).toLocaleString("en-IN")}
              </p>
              <p>Quantity: {quantity}</p>
            </div>
          </div>

          <div className="checkout-totals">
            <p>
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString("en-IN")}</span>
            </p>
            <p className="checkout-final-total">
              <strong>Total</strong>
              <strong>₹{subtotal.toLocaleString("en-IN")}</strong>
            </p>
          </div>

          <p className="checkout-demo-note">
            Payment is processed securely through Razorpay.
          </p>
        </aside>
      </div>

      {testModal && (
        <div
          className="razorpay-mock-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rzp-test-title"
        >
          <div className="razorpay-mock-modal">
            <div className="razorpay-mock-header">
              <div className="razorpay-mock-brand">
                <div className="razorpay-mock-logo">R</div>
                <div>
                  <h3 id="rzp-test-title">TrendWear</h3>
                  <p>Order #{testModal.orderNumber}</p>
                </div>
              </div>
              <div className="razorpay-mock-amount">
                <span className="razorpay-mock-badge">TEST MODE</span>
                <strong>
                  ₹{(testModal.amount / 100).toLocaleString("en-IN")}
                </strong>
              </div>
            </div>

            <div className="razorpay-mock-body">
              <div className="razorpay-mock-notice">
                ⚡ <strong>Razorpay Test Simulator:</strong> Test mode is active. You can test your purchase using simulated UPI, Card, or Net Banking options.
              </div>

              <div className="razorpay-mock-methods">
                <label className="razorpay-mock-method">
                  <input
                    type="radio"
                    name="mock_method"
                    value="upi"
                    checked={selectedMethod === "upi"}
                    onChange={() => setSelectedMethod("upi")}
                  />
                  <div className="razorpay-mock-method-text">
                    <strong>UPI / QR (Google Pay, PhonePe, Paytm)</strong>
                    <span>Test VPA: success@razorpay</span>
                  </div>
                  <span className="razorpay-method-pill">Instant</span>
                </label>

                <label className="razorpay-mock-method">
                  <input
                    type="radio"
                    name="mock_method"
                    value="card"
                    checked={selectedMethod === "card"}
                    onChange={() => setSelectedMethod("card")}
                  />
                  <div className="razorpay-mock-method-text">
                    <strong>Card (Credit / Debit)</strong>
                    <span>Visa / Master (Test: 4000 0000 0000 0002)</span>
                  </div>
                </label>

                <label className="razorpay-mock-method">
                  <input
                    type="radio"
                    name="mock_method"
                    value="netbanking"
                    checked={selectedMethod === "netbanking"}
                    onChange={() => setSelectedMethod("netbanking")}
                  />
                  <div className="razorpay-mock-method-text">
                    <strong>Net Banking</strong>
                    <span>SBI, HDFC, ICICI, Axis Bank</span>
                  </div>
                </label>
              </div>

              <div className="razorpay-mock-actions">
                <button
                  type="button"
                  className="razorpay-pay-btn"
                  onClick={async () => {
                    try {
                      const simulatedPaymentId = `pay_test_${Date.now()}`;
                      const verifyRes =
                        await api.orders.verifyRazorpayPayment({
                          orderNumber: testModal.orderNumber,
                          razorpay_order_id: testModal.razorpayOrderId,
                          razorpay_payment_id: simulatedPaymentId,
                          razorpay_signature: "mock_signature_test",
                        });
                      testModal.resolve({
                        verified: true,
                        paymentId: simulatedPaymentId,
                        razorpayOrderId: testModal.razorpayOrderId,
                        order: verifyRes?.data?.order,
                      });
                      setTestModal(null);
                    } catch (err) {
                      testModal.reject(err);
                      setTestModal(null);
                    }
                  }}
                >
                  Pay ₹{(testModal.amount / 100).toLocaleString("en-IN")} (Simulate Success)
                </button>
                <button
                  type="button"
                  className="razorpay-cancel-btn"
                  onClick={() => {
                    testModal.reject(
                      new Error("Payment was cancelled or closed.")
                    );
                    setTestModal(null);
                  }}
                >
                  Cancel Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Checkout;
