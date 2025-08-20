import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./App.css";

export default function App() {
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Convert to dd/mm/yy format
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2); // 2-digit year
    return `${day}/${month}/${year}`;
  };


 const fetchTripPlan = async () => {
  if (!startDate || !endDate) {
    alert("Please select both start and end dates");
    return;
  }

  const totalDays =
    Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  const payload = {
    city,
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
    total_days: totalDays
  };

  console.log("📤 Sending to backend:", payload);

  try {
    setTripData(null);
    setLoading(true);

    // Step 1: Call /prompt
    await axios.post("http://localhost:5000/prompt", {
      city,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate)
    });

    // Step 2: Call /temp with EMPTY body (backend will use stored recommendations)
    const tempResponse = await axios.post("http://localhost:5000/temp", {});

    // Step 3: Call /finalTrip with payload + temp_data
    const finalPayload = {
      ...payload,
      temperatureData: tempResponse.data.results
    };

    const response = await axios.post(
      "http://localhost:5000/finalTrip",
      finalPayload
    );

    setTripData(response.data);
  } catch (error) {
    console.error("Backend error:", error.response?.data || error.message);
    alert(
      `Error: ${
        error.response?.data?.error || "Failed to fetch trip plan"
      }`
    );
  } finally {
    setLoading(false);
  }
};


  // 📌 Download PDF function
  const downloadPDF = () => {
  const input = document.querySelector(".trip-output");

  html2canvas(input, { scale: 2 }).then((canvas) => {
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Extra pages if content is long
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(`TripPlan_${tripData.city}.pdf`);
  });
};

  return (
    <div className="app-container">
      <h1>Trip Planner</h1>

      <div className="form-group">
        <label>City: </label>
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">Select a City</option>
          <option value="Bangalore">Bangalore</option>
        </select>
      </div>

      <div className="form-group">
        <label>Start Date: </label>
        <DatePicker
          selected={startDate}
          onChange={(date) => setStartDate(date)}
          dateFormat="dd/MM/yyyy"
          placeholderText="Select start date"
        />
      </div>

      <div className="form-group">
        <label>End Date: </label>
        <DatePicker
          selected={endDate}
          onChange={(date) => setEndDate(date)}
          dateFormat="dd/MM/yyyy"
          placeholderText="Select end date"
        />
      </div>

      <div className="get-trip-btn-container">
        <button className="btn" onClick={fetchTripPlan}>
          {loading ? "Loading..." : "Get Trip Plan"}
        </button>
      </div>


      {tripData ? (
  <div className="trip-output">
    <h2>
      Trip Plan for {tripData.city} ({tripData.start_date} → {tripData.end_date})
    </h2>
    <p>
      <strong>Total Days:</strong> {tripData.total_days}
    </p>

    <div className="trip-plan-box">
      {tripData.trip_plan
        ? tripData.trip_plan.split("\n").map((line, idx) => {
            const cleaned = line.replace(/\*/g, "").trim();

            const headingMatch = cleaned.match(
              /^(Day\s*\d+|Places|Transport|Weather|Tips|Activities|Costs)\s*[:\-]?/i
            );

            if (headingMatch) {
              const heading = headingMatch[1];
              const rest = cleaned.slice(headingMatch[0].length).trim();

              return (
                <p key={idx}>
                  <strong style={{ color: "teal" }}>{heading}:</strong> {rest}
                </p>
              );
            }

            return <p key={idx}>{cleaned}</p>;
          })
        : <p>No trip plan available yet.</p>}
    </div>

    <div className="download-btn-container">
      <button className="btn" onClick={downloadPDF}>
        Download as PDF
      </button>
    </div>
  </div>
) : (
  <p>Please enter trip details to generate a plan.</p>
)}

    </div>
  );
}
