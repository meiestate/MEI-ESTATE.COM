function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function calculateLoanAmountFromEMI(emi, annualRate, tenureYears) {
  const monthlyRate = annualRate / 12 / 100;
  const months = tenureYears * 12;

  if (monthlyRate === 0) {
    return emi * months;
  }

  const loanAmount =
    emi * ((Math.pow(1 + monthlyRate, months) - 1) /
    (monthlyRate * Math.pow(1 + monthlyRate, months)));

  return loanAmount;
}

function getValue(id) {
  return parseFloat(document.getElementById(id).value) || 0;
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

document.getElementById("calculateBtn").addEventListener("click", function () {
  const monthlyIncome = getValue("monthlyIncome");
  const existingEmi = getValue("existingEmi");
  const otherExpenses = getValue("otherExpenses");
  const downPayment = getValue("downPayment");
  const interestRate = getValue("interestRate");
  const loanTenure = getValue("loanTenure");
  const foir = getValue("foir");

  if (!monthlyIncome || !interestRate || !loanTenure || !foir) {
    alert("Please fill all required values.");
    return;
  }

  const maxAllowedEmi = (monthlyIncome * foir) / 100;
  const eligibleEmi = Math.max(0, maxAllowedEmi - existingEmi - otherExpenses);

  const loanAmount = calculateLoanAmountFromEMI(
    eligibleEmi,
    interestRate,
    loanTenure
  );

  const affordablePropertyValue = loanAmount + downPayment;

  setText("eligibleEmi", formatCurrency(eligibleEmi));
  setText("loanAmount", formatCurrency(loanAmount));
  setText("propertyValue", formatCurrency(affordablePropertyValue));
});

document.getElementById("resetBtn").addEventListener("click", function () {
  document.querySelectorAll("input").forEach(input => {
    if (input.id === "foir") {
      input.value = 50;
    } else {
      input.value = "";
    }
  });

  setText("eligibleEmi", "₹ 0");
  setText("loanAmount", "₹ 0");
  setText("propertyValue", "₹ 0");
});