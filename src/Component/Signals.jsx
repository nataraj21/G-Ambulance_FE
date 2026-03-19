import React, { useEffect, useState } from "react";
import { getSignals } from "../Services/Api";

function Signal() {

  const [signals, setSignals] = useState([]);

  useEffect(() => {

    getSignals()
      .then(res => {
        console.log(res.data);  
        setSignals(res.data);
      })
      .catch(err => {
        console.error(err);
      });

  }, []);

  return (
    <div>
      <h2>Signals</h2>

      {signals.map((s) => (
        <p key={s.id}>{s.signalName}</p>
      ))}

    </div>
  );
}

export default Signal;