// app.js – simple front-end rate calculator (no uploads)
document.addEventListener("DOMContentLoaded", () => {
  const rateBtn = document.getElementById("rateBtn");
  const clearBtn = document.getElementById("clearBtn");

  rateBtn.addEventListener("click", () => {
    const weight = parseFloat(document.getElementById("weight").value) || 0;
    const baseRate = parseFloat(document.getElementById("class").value) || 0;
    const discount = parseFloat(document.getElementById("discount").value) || 0;
    const floor = parseFloat(document.getElementById("floor").value) || 0;
    const fuel = parseFloat(document.getElementById("fuel").value) || 0;
    const acc = parseFloat(document.getElementById("accessorials").value) || 0;

    const gross = weight * (baseRate / 100);
    const discounted = gross * (1 - discount / 100);
    const fuelCost = gross * (fuel / 100);
    const subtotal = discounted + fuelCost + acc;
    const net = Math.max(subtotal, floor);

    document.getElementById("grossVal").textContent = `$${gross.toFixed(2)}`;
    document.getElementById("discVal").textContent = `$${discounted.toFixed(2)}`;
    document.getElementById("floorVal").textContent = `$${floor.toFixed(2)}`;
    document.getElementById("fuelVal").textContent = `$${fuelCost.toFixed(2)}`;
    document.getElementById("accVal").textContent = `$${acc.toFixed(2)}`;
    document.getElementById("netVal").textContent = `$${net.toFixed(2)}`;
  });

  clearBtn.addEventListener("click", () => {
    document.querySelectorAll("input").forEach(i => i.value = "");
    document.querySelectorAll("#grossVal,#discVal,#floorVal,#fuelVal,#accVal,#netVal").forEach(el => el.textContent = "—");
  });
});
