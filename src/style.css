/* ==== RESET ==== */
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #111;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  font-family: system-ui, -apple-system, sans-serif;
}

canvas {
  display: block;
}

/* ==== JOYSTICK (kiri bawah) ==== */
#joyBase {
  position: fixed;
  left: 30px;
  bottom: 40px;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  border: 2px solid rgba(255, 255, 255, 0.35);
  pointer-events: none;
  z-index: 10;
}

#joyKnob {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 55px;
  height: 55px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  border: 2px solid rgba(255, 255, 255, 0.7);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* ==== TOMBOL LOMPAT (kanan bawah) ==== */
#jumpBtn {
  position: fixed;
  right: 40px;
  bottom: 60px;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.4);
  color: rgba(255, 255, 255, 0.85);
  font-size: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
  transition: background 0.1s;
}

#jumpBtn.active {
  background: rgba(255, 255, 255, 0.35);
}

/* ==== HOTBAR (bawah tengah) ==== */
#hotbar {
  position: fixed;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  z-index: 10;
  pointer-events: none;
}

.slot {
  width: 44px;
  height: 44px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.slot.selected {
  border-color: #ffd54f;
  box-shadow: 0 0 8px #ffd54f;
}

.slot .color {
  width: 28px;
  height: 28px;
  border-radius: 3px;
}

.slot .num {
  position: absolute;
  top: 2px;
  left: 4px;
  font-size: 10px;
  color: white;
  text-shadow: 1px 1px 2px black;
}

/* ==== INFO KOORDINAT (kiri atas) ==== */
#info {
  position: fixed;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.45);
  color: white;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  z-index: 10;
  pointer-events: none;
  line-height: 1.4;
}

#info .row {
  display: flex;
  gap: 10px;
}

#info .val {
  color: #a5d6a7;
  font-weight: bold;
}

/* ==== CROSSHAIR (tengah) ==== */
#crosshair {
  position: fixed;
  left: 50%;
  top: 50%;
  width: 22px;
  height: 22px;
  transform: translate(-50%, -50%);
  z-index: 10;
  pointer-events: none;
}

#crosshair::before,
#crosshair::after {
  content: '';
  position: absolute;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 0 2px black;
}

#crosshair::before {
  left: 50%;
  top: 0;
  width: 2px;
  height: 100%;
  transform: translateX(-50%);
}

#crosshair::after {
  top: 50%;
  left: 0;
  height: 2px;
  width: 100%;
  transform: translateY(-50%);
}
