

import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import "./App.css";

export default function TripPlanner() {
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

      await axios.post("http://localhost:5000/prompt", {
        city,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate)
      });

      const response = await axios.post(
        "http://localhost:5000/finalTrip",
        payload
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

      <button className="btn" onClick={fetchTripPlan}>
        {loading ? "Loading..." : "Get Trip Plan"}
      </button>

      {tripData && (
        <div className="trip-output">
          <h2>
            Trip Plan for {tripData.city} ({tripData.start_date} →{" "}
            {tripData.end_date})
          </h2>
          <p>
            <strong>Total Days:</strong> {tripData.total_days}
          </p>
          <div className="trip-plan-box">
            {tripData.trip_plan.split("\n").map((line, idx) => {
  const trimmed = line.trim();

  // Replace markdown-style bold (**text**) with actual <strong> elements
  const partsWithBold = trimmed.split(/(\*\*.*?\*\*)/g).map((part, i) => {
    if (/^\*\*.*\*\*$/.test(part)) {
      return <strong key={i}>{part.replace(/\*\*/g, "")}</strong>;
    }
    return part;
  });

  return <p key={idx}>{partsWithBold}</p>;
})}


          </div>
        </div>
      )}
    </div>
  );
}
