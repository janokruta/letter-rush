import { useState, useEffect, useRef, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Zawartość                                                          */
/* ------------------------------------------------------------------ */

// Bez Q, V, X, Y — na te litery nie zaczyna się żadne polskie słowo.
// Bez znaków diakrytycznych: słowa na Ł, Ś, Ż liczą się jako L, S, Z.
const ALPHABET = "ABCDEFGHIJKLMNOPRSTUWZ".split("");

const CATEGORIES_ALL = [
  "Zwierzęta", "Rzeczy w kuchni", "Państwa", "Miasta w Polsce", "Filmy",
  "Zawody", "Owoce i warzywa", "Części ciała", "Sporty", "Instrumenty muzyczne",
  "Rzeczy w plecaku", "Ubrania", "Napoje", "Gry planszowe", "Narzędzia",
  "Owady", "Postacie z bajek", "Coś zimnego", "Przedmioty w szkole",
  "Rzeczy w kosmosie", "Marki", "Rzeczy na kołach", "Rośliny", "Gry komputerowe",
  "Wymówki na spóźnienie", "Stwory z mitologii", "Rzeczy w szpitalu",
  "Rzeczy, które ładnie pachną", "Zespoły muzyczne", "Rzeczy na plaży",
  "Języki i narzędzia programisty", "Rzeczy w łazience", "Dodatki do kanapki",
  "Rzeczy, które latają", "Stolice", "Rzeczy, których szkoda wyrzucić",
  "Polskie rzeki i góry", "Rzeczy w samochodzie", "Słodycze", "Imiona",
];

// Tryb dziecięcy: same rzeczy, które siedmiolatek widzi, je albo ma w pokoju.
// Żadnych stolic, marek, mitologii ani zespołów muzycznych.
const CATEGORIES_KIDS = [
  "Zwierzęta", "Zwierzęta w zoo", "Zwierzęta na wsi", "Zwierzaki domowe", "Ptaki",
  "Owady i robaki", "Owoce", "Warzywa", "Słodycze", "Napoje",
  "Coś do jedzenia", "Rzeczy w lodówce", "Rzeczy w kuchni", "Rzeczy w łazience",
  "Rzeczy w moim pokoju", "Zabawki", "Ubrania", "Rzeczy w plecaku", "Rzeczy w piórniku",
  "Postacie z bajek", "Pojazdy", "Rzeczy, które mają koła", "Rzeczy, które latają",
  "Rzeczy na placu zabaw", "Rzeczy w parku", "Rzeczy na plaży", "Rzeczy w sklepie",
  "Imiona dziewczynek", "Imiona chłopców", "Części ciała", "Kwiaty i drzewa",
  "Coś zimnego", "Coś miękkiego", "Coś okrągłego", "Coś, co robi hałas",
  "Coś, co świeci", "Rzeczy, które są zielone", "Zawody", "Sporty", "Instrumenty muzyczne",
];

// Tryb 18+: mieszanka imprezowo-alkoholowa z kilkoma śmielszymi hasłami.
const CATEGORIES_18 = [
  "Drinki i koktajle", "Marki alkoholi", "Powody na kaca", "Teksty na podryw",
  "Rzeczy w sypialni", "Czego żałujesz po imprezie", "Zły pomysł na pierwszej randce",
  "Wymówki dla partnera", "Co robisz po pijaku", "Kluby i bary", "Używki",
  "Aplikacje randkowe", "Fetysze", "Rzeczy, których nie powiesz teściowej",
  "Powody rozstania", "Gadżety dla dorosłych", "Imprezowe gry", "Rodzaje kaca",
  "Przytyki do byłej lub byłego", "Filmy tylko dla dorosłych", "Rzeczy w pokoju hotelowym",
  "Najgorsze prezenty", "Sekretne nałogi", "O co kłócą się pary", "Kłamstwa na randce",
  "Co chowasz przed gośćmi", "Karaoke po piwie", "Wpadki na weselu",
  "Co mówisz po trzecim drinku", "Napoje na kaca", "Miejsca na szybki numerek",
  "Co robisz, gdy nikt nie patrzy", "Powody spóźnienia w poniedziałek",
  "Rzeczy w damskiej torebce", "Sposoby na zerwanie", "Zakazane związki",
  "Rzeczy, które kusi ukraść z hotelu", "Powody, żeby wziąć taxi", "Nocne zachcianki",
  "Rzeczy, o których nie mówisz mamie",
];

const BULBS = 20;

/* ------------------------------------------------------------------ */
/*  Dźwięk                                                             */
/* ------------------------------------------------------------------ */

function useSound(enabled) {
  const ctxRef = useRef(null);
  // Zawsze aktualny stan wyciszenia — dzięki temu nawet "stare" domknięcia
  // (np. działający już interwał zegara) widzą wyciszenie w locie.
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const ctx = useCallback(() => {
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctxRef.current) ctxRef.current = new AC();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const tone = useCallback(
    (freq, dur, type = "square", vol = 0.15, slideTo = null) => {
      if (!enabledRef.current) return;
      const c = ctx();
      if (!c) return;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
      gain.gain.setValueAtTime(vol, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      osc.connect(gain).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + dur + 0.02);
    },
    [ctx]
  );

  return {
    unlock: ctx,
    tick: () => tone(760, 0.07, "square", 0.09),
    hurry: () => tone(1000, 0.09, "square", 0.14),
    win: () => {
      tone(660, 0.09, "triangle", 0.18);
      setTimeout(() => tone(990, 0.16, "triangle", 0.18), 90);
    },
    lose: () => tone(200, 0.5, "sawtooth", 0.16, 70),
  };
}

/* ------------------------------------------------------------------ */
/*  Pomocnicze                                                         */
/* ------------------------------------------------------------------ */

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const nextInPlay = (list, from) => {
  for (let i = 1; i <= list.length; i++) {
    const idx = (from + i) % list.length;
    if (list[idx].lives > 0 && !list[idx].skipped) return idx;
  }
  return from;
};

/* ------------------------------------------------------------------ */
/*  Ikony (Material Design, inline SVG — dziedziczą currentColor)      */
/* ------------------------------------------------------------------ */

const VolumeOnIcon = () => (
  <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06a6.99 6.99 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54z" />
  </svg>
);

const VolumeOffIcon = () => (
  <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true">
    <path d="M4.34 2.93 2.93 4.34 7.29 8.7 7 9H3v6h4l5 5v-6.59l4.18 4.18c-.65.49-1.38.88-2.18 1.11v2.06a8.9 8.9 0 0 0 3.61-1.75l2.05 2.05 1.41-1.41L4.34 2.93zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53A8.9 8.9 0 0 0 21 12a9 9 0 0 0-7-8.77v2.06A6.99 6.99 0 0 1 19 12zm-2.5 0A4.5 4.5 0 0 0 14 7.97v1.79l2.48 2.48c.01-.08.02-.16.02-.24zM12 4 9.91 6.09 12 8.18V4z" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
    <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Gra                                                                */
/* ------------------------------------------------------------------ */

export default function NaLitere() {
  const [names, setNames] = useState(["Gracz 1", "Gracz 2"]);
  const [limit, setLimit] = useState(10);
  const [startLives, setStartLives] = useState(3);
  const [soundOn, setSoundOn] = useState(true);
  const [instant, setInstant] = useState(true);
  const [missRule, setMissRule] = useState("skip"); // skip | life
  const [mode, setMode] = useState("all"); // all | kids | adult

  // setup | ready | live | result | roundend | over
  const [phase, setPhase] = useState("setup");
  const [players, setPlayers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [taken, setTaken] = useState({}); // litera -> imię gracza
  const [category, setCategory] = useState("");
  const [round, setRound] = useState(1);
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [banner, setBanner] = useState(null);
  const [winner, setWinner] = useState(null);
  const [confirmSkip, setConfirmSkip] = useState(false);

  const deck = useRef([]);
  const turnId = useRef(0);
  const locked = useRef(false);
  const wakeLock = useRef(null);
  const pausedLeft = useRef(null); // zamrożony czas, gdy otwarte jest okno potwierdzenia

  const sfx = useSound(soundOn);
  const openCount = ALPHABET.length - Object.keys(taken).length;

  const pool = mode === "kids" ? CATEGORIES_KIDS : mode === "adult" ? CATEGORIES_18 : CATEGORIES_ALL;

  const drawCategory = useCallback(() => {
    if (!deck.current.length) deck.current = shuffle(pool);
    return deck.current.pop();
  }, [pool]);

  /* ---- zegar: chodzi tylko wtedy, gdy plansza jest żywa ---- */
  useEffect(() => {
    if (phase !== "live" || confirmSkip) return;
    const total = limit * 1000;
    // wznawiając po pauzie, startujemy od zamrożonego czasu, a nie od pełnej puli
    const startMs = pausedLeft.current != null ? pausedLeft.current : total;
    pausedLeft.current = null;
    const deadline = Date.now() + startMs;
    let lastBeep = Math.ceil(startMs / 1000);
    setLeft(startMs);

    const id = setInterval(() => {
      const ms = deadline - Date.now();
      if (ms <= 0) {
        setLeft(0);
        clearInterval(id);
        resolve(null);
        return;
      }
      setLeft(ms);
      const sec = Math.ceil(ms / 1000);
      if (sec < lastBeep) {
        lastBeep = sec;
        if (sec <= 2) sfx.hurry();
        else if (sec <= 3) sfx.tick();
      }
    }, 40);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, turnId.current, confirmSkip]);

  /* ---- ekran nie gaśnie w trakcie gry ---- */
  const playing = phase !== "setup" && phase !== "over";
  useEffect(() => {
    if (!playing) return;
    let cancelled = false;
    (async () => {
      try {
        if ("wakeLock" in navigator) {
          const wl = await navigator.wakeLock.request("screen");
          if (cancelled) wl.release();
          else wakeLock.current = wl;
        }
      } catch (e) {
        /* brak wsparcia — trudno */
      }
    })();
    return () => {
      cancelled = true;
      if (wakeLock.current) {
        wakeLock.current.release().catch(() => {});
        wakeLock.current = null;
      }
    };
  }, [playing]);

  /* ---- rozstrzygnięcie tury: letter === null oznacza, że wygrał zegar ---- */
  function resolve(letter) {
    if (locked.current) return;
    locked.current = true;

    const who = players[current];
    const ok = !!letter;

    if (ok) sfx.win();
    else {
      sfx.lose();
      if (navigator.vibrate) navigator.vibrate([90, 60, 160]);
    }

    const updated = players.map((p, i) =>
      i === current
        ? {
            ...p,
            score: p.score + (ok ? 1 : 0),
            lives: p.lives - (ok ? 0 : 1),
            skipped: p.skipped || (!ok && missRule === "skip"),
          }
        : p
    );
    const updatedTaken = ok ? { ...taken, [letter]: who.name } : taken;

    // następnego gracza zapowiadamy tylko wtedy, gdy runda faktycznie trwa dalej
    const stillIn = updated.filter((p) => p.lives > 0 && !p.skipped);
    const carriesOn = stillIn.length > 1 && Object.keys(updatedTaken).length < ALPHABET.length;
    const upNext = carriesOn ? updated[nextInPlay(updated, current)] : null;

    setResult({
      ok,
      letter,
      name: who.name,
      skipped: !ok && missRule === "skip",
      next: upNext && upNext !== updated[current] ? upNext.name : null,
    });
    setPlayers(updated);
    setTaken(updatedTaken);
    setPhase("result");

    setTimeout(() => advance(updated, updatedTaken), instant ? 950 : 1250);
  }

  function advance(list, takenNow) {
    const alive = list.filter((p) => p.lives > 0);

    // koniec gry: zostaje jeden gracz z życiami (albo żaden, gdy gra się solo)
    if (list.length === 1 ? alive.length === 0 : alive.length <= 1) {
      setWinner(alive[0] || null);
      setPhase("over");
      locked.current = false;
      return;
    }

    const stillIn = alive.filter((p) => !p.skipped);
    const boardEmpty = Object.keys(takenNow).length >= ALPHABET.length;
    const roundOver = boardEmpty || (list.length > 1 ? stillIn.length <= 1 : stillIn.length === 0);

    if (roundOver) {
      const survivor = stillIn.length === 1 ? stillIn[0] : null;
      // wszyscy, którym zostało życie, wracają do gry przy nowej kategorii
      const reborn = list.map((p) => ({
        ...p,
        skipped: false,
        score: p.score + (p === survivor ? 1 : 0),
      }));

      setPlayers(reborn);
      setTaken({});
      setCategory(drawCategory());
      setRound((r) => r + 1);
      setResult(null);
      setBanner({ survivor: survivor ? survivor.name : null, cleared: boardEmpty });
      setPhase("roundend");

      setTimeout(() => {
        setBanner(null);
        setCurrent((c) => nextInPlay(reborn, c));
        locked.current = false;
        turnId.current += 1;
        setPhase(instant ? "live" : "ready");
      }, 1700);
      return;
    }

    setCurrent((c) => nextInPlay(list, c));
    setResult(null);
    locked.current = false;

    if (instant) {
      turnId.current += 1;
      setPhase("live");
    } else {
      setPhase("ready");
    }
  }

  /* ---- akcje ---- */
  function startGame() {
    sfx.unlock();
    deck.current = shuffle(pool);
    setPlayers(
      names.map((n, i) => ({ name: n.trim() || `Gracz ${i + 1}`, score: 0, lives: startLives, skipped: false }))
    );
    setTaken({});
    setCategory(deck.current.pop());
    setRound(1);
    setCurrent(0);
    setWinner(null);
    setResult(null);
    setBanner(null);
    locked.current = false;
    setPhase("ready");
  }

  function goLive() {
    sfx.unlock();
    locked.current = false;
    turnId.current += 1;
    setPhase("live");
  }

  function claim(letter) {
    if (phase !== "live" || taken[letter]) return;
    resolve(letter);
  }

  function askSkip() {
    if (phase !== "live") return;
    pausedLeft.current = left; // zamroź pozostały czas na czas decyzji
    setConfirmSkip(true);
  }

  function cancelSkip() {
    setConfirmSkip(false); // wznów turę z zamrożonym czasem
  }

  function skipCategory() {
    // potwierdzone: świeże hasło i pełny czas dla tej samej tury; plansza zostaje
    pausedLeft.current = null;
    setConfirmSkip(false);
    setCategory(drawCategory());
    turnId.current += 1;
  }

  const litBulbs = Math.ceil((left / (limit * 1000)) * BULBS);
  const panic = left <= 2000 && phase === "live";
  const firstTurn = round === 1 && Object.keys(taken).length === 0;

  /* ------------------------------------------------------------------ */

  return (
    <div className="lr-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bungee&family=Archivo:wght@400;600;800&display=swap');

        .lr-root{
          --plum:#1E1036; --plum-2:#2C1A50; --plum-3:#3B2468;
          --paper:#F6EEDF; --marigold:#FFC93C; --tomato:#FF5A5F; --jade:#4FC79B;
          --edge-amber:#C6900F; --edge-plum:#140A26;
          --tile-top:#FBF4E6; --tile-bot:#EFE3CC;
          --lift:0 14px 26px -10px rgba(0,0,0,.6);
          --display:'Bungee','Impact','Haettenschweiler','Arial Narrow Bold',sans-serif;
          --body:'Archivo',system-ui,-apple-system,'Segoe UI',sans-serif;
          position:fixed; inset:0;
          display:flex; flex-direction:column;
          background:radial-gradient(135% 95% at 50% -15%, var(--plum-2) 0%, var(--plum) 58%);
          color:var(--paper);
          font-family:var(--body);
          -webkit-tap-highlight-color:transparent;
          overflow:hidden;
        }
        .lr-root *{box-sizing:border-box; margin:0; padding:0;}
        /* :where() keeps the reset at (0,0,1) so component backgrounds (.big, .tile, .seg…) win */
        :where(.lr-root) button{font-family:inherit; border:0; background:none; color:inherit; cursor:pointer;}
        .lr-root :focus-visible{outline:3px solid var(--marigold); outline-offset:3px;}

        .bar{display:flex; align-items:center; gap:8px; padding:14px 16px 10px;}
        .round-tag{display:inline-flex; align-items:baseline; gap:6px; padding:6px 13px; border-radius:999px; background:var(--plum-2);}
        .round-tag u{text-decoration:none; font-size:10px; letter-spacing:.14em; text-transform:uppercase; font-weight:800; opacity:.5;}
        .round-tag b{font-family:var(--display); font-size:15px; line-height:1; color:var(--marigold); font-variant-numeric:tabular-nums;}
        .mode-pill{padding:7px 12px; border-radius:999px; font-size:11px; font-weight:800; color:var(--plum);}
        .mode-pill.kids{background:var(--jade);}
        .mode-pill.adult{background:var(--tomato); color:var(--paper);}
        .chip{margin-left:auto; display:flex; gap:8px;}
        .icon{width:38px; height:38px; border-radius:11px; background:var(--plum-2);
              display:grid; place-items:center; font-size:15px; transition:transform .06s ease;}
        .icon:active{transform:scale(.92);}

        .cat{padding:2px 16px 12px;}
        .cat h1{font-family:var(--display); font-size:clamp(23px,7.6vw,36px); line-height:1.04;
                color:var(--marigold); text-transform:uppercase; text-wrap:balance;}

        .strip{display:flex; gap:8px; overflow-x:auto; padding:0 16px 12px; scrollbar-width:none;}
        .strip::-webkit-scrollbar{display:none;}
        .pcard{flex:0 0 auto; min-width:96px; padding:8px 12px; border-radius:14px;
               background:var(--plum-2); border:2px solid transparent;}
        .pcard.on{border-color:var(--marigold); background:var(--plum-3);}
        .pcard.dead{opacity:.28;}
        .pcard.skip{opacity:.42; border-color:var(--tomato);}
        .pname{font-weight:800; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:110px;}
        .pmeta{display:flex; align-items:center; gap:8px; margin-top:5px;}
        .pscore{font-size:18px; font-weight:800; font-variant-numeric:tabular-nums; line-height:1;}
        .hearts{display:flex; gap:3px;}
        .heart{width:7px; height:7px; border-radius:50%; background:var(--tomato);}
        .heart.gone{background:rgba(246,238,223,.18);}

        .stage{flex:1; min-height:0; display:flex; flex-direction:column; padding:0 16px 16px;}

        /* zegar-marquee: żarówki gasną nad planszą */
        .marquee{display:grid; grid-template-columns:repeat(${BULBS},1fr); gap:4px; padding:6px 0 14px;}
        .bulb{aspect-ratio:1; border-radius:50%; background:var(--marigold);
              box-shadow:0 0 10px rgba(255,201,60,.6); transition:background .22s ease, box-shadow .22s ease;}
        .bulb.off{background:rgba(246,238,223,.09); box-shadow:none;}
        .bulb.hot{background:var(--tomato); box-shadow:0 0 12px rgba(255,90,95,.75);}

        .hint{text-align:center; font-family:var(--display); font-size:clamp(12px,3.7vw,16px);
              text-transform:uppercase; color:var(--marigold); padding-bottom:12px;}
        .hint.hot{color:var(--tomato);}
        @media (prefers-reduced-motion:no-preference){
          .hint.hot{animation:buzz .3s infinite alternate;}
          @keyframes buzz{from{transform:translateY(0)}to{transform:translateY(-3px)}}
        }

        .whoami{display:flex; align-items:center; justify-content:center; gap:9px; padding-bottom:12px;}
        .whoami b{font-family:var(--display); font-size:clamp(15px,4.8vw,21px); text-transform:uppercase;}
        .whoami .heart{width:8px; height:8px;}

        .grid{flex:1; min-height:0; display:flex; flex-wrap:wrap; gap:7px;
              align-content:center; justify-content:center;}
        .tile{flex:0 0 calc(20% - 5.6px); aspect-ratio:1; border-radius:14px; color:var(--plum);
              background:linear-gradient(180deg,var(--tile-top) 0%,var(--tile-bot) 100%);
              font-family:var(--display); font-size:clamp(17px,5.4vw,28px); display:grid; place-items:center;
              box-shadow:0 3px 0 rgba(20,10,38,.45), inset 0 1px 0 rgba(255,255,255,.7);
              transition:transform .08s ease, box-shadow .08s ease; position:relative;}
        .tile:active{transform:translateY(3px); box-shadow:0 0 0 rgba(20,10,38,.45), inset 0 1px 0 rgba(255,255,255,.7);}
        .tile.used{background:var(--plum-2); color:rgba(246,238,223,.26);
              box-shadow:inset 0 2px 5px rgba(0,0,0,.4); transform:none;}
        .tile.used::after{content:''; position:absolute; left:24%; right:24%; height:2px;
              background:currentColor; transform:rotate(-20deg);}

        .handoff{flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center;
                 text-align:center; gap:12px;}
        .handoff b{font-family:var(--display); font-size:clamp(30px,11vw,50px); text-transform:uppercase; line-height:1; color:var(--marigold);}
        .handoff span{font-size:12px; letter-spacing:.16em; text-transform:uppercase; font-weight:800; opacity:.5;}
        .handoff em{font-style:normal; font-size:12.5px; font-weight:800; opacity:.9; margin-top:8px;
                    padding:8px 15px; border-radius:999px; background:var(--plum-2);}
        .handoff em i{font-style:normal; color:var(--marigold); font-variant-numeric:tabular-nums;}

        .big{width:100%; padding:19px; border-radius:16px; color:var(--plum);
             background:linear-gradient(180deg,#FFD65C 0%,#FFC22E 100%);
             font-family:var(--display); font-size:20px; text-transform:uppercase; letter-spacing:.02em;
             box-shadow:0 6px 0 var(--edge-amber), var(--lift), inset 0 1px 0 rgba(255,255,255,.55);
             transition:transform .07s ease, box-shadow .07s ease;}
        .big:active{transform:translateY(5px);
             box-shadow:0 1px 0 var(--edge-amber), 0 6px 12px -8px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.55);}
        .big.ghost{background:var(--plum-2); color:var(--paper); font-size:15px; padding:15px;
             box-shadow:0 6px 0 var(--edge-plum), var(--lift), inset 0 1px 0 rgba(246,238,223,.06);}
        .big.ghost:active{transform:translateY(5px); box-shadow:0 1px 0 var(--edge-plum), 0 6px 12px -8px rgba(0,0,0,.5);}
        .big:disabled{background:var(--plum-2); color:rgba(246,238,223,.32);
             box-shadow:inset 0 0 0 1.5px rgba(246,238,223,.08); transform:none; cursor:default;}

        .flash{position:absolute; inset:0; z-index:20; display:grid; place-items:center; text-align:center; padding:24px;}
        .flash.good{background:var(--jade); color:#0B2C21;}
        .flash.bad{background:var(--tomato); color:#3A0A0C;}
        .flash.round{background:var(--plum-3); color:var(--paper);}
        .flash.round h2{color:var(--marigold);}
        .flash h2{font-family:var(--display); font-size:clamp(34px,12vw,64px); line-height:1;}
        .flash p{font-weight:800; margin-top:10px; font-size:15px; letter-spacing:.06em; text-transform:uppercase;}
        .flash p.up{font-family:var(--display); font-size:clamp(20px,7vw,30px); letter-spacing:0; margin-top:22px; opacity:.85;}
        @media (prefers-reduced-motion:no-preference){
          .flash{animation:flashin .16s ease-out;}
          @keyframes flashin{from{opacity:0} to{opacity:1}}
          .flash h2{animation:pop .28s cubic-bezier(.2,1.3,.4,1);}
          @keyframes pop{from{transform:scale(.82)} to{transform:scale(1)}}
        }

        .setup{flex:1; min-height:0; overflow-y:auto; padding:8px 16px 24px; -webkit-overflow-scrolling:touch;}
        .logo{font-family:var(--display); font-size:clamp(40px,14vw,68px); line-height:.94; color:var(--marigold); text-transform:uppercase;}
        .logo em{display:block; font-style:normal; color:var(--paper);}
        .tag{margin:14px 0 24px; font-size:14px; line-height:1.5; opacity:.65; max-width:36ch;}
        .field{margin-bottom:20px;}
        .field > label{display:block; font-size:13.5px; letter-spacing:.005em;
                       font-weight:800; opacity:.62; margin-bottom:10px;}
        .nameRow{display:flex; gap:8px; margin-bottom:8px;}
        .nameRow input{flex:1; padding:14px 15px; border-radius:13px; border:2px solid var(--plum-3);
                       background:var(--plum-2); color:var(--paper); font-size:16px; font-weight:600; font-family:var(--body);}
        .nameRow input:focus{border-color:var(--marigold); outline:none;}
        .del{width:48px; border-radius:13px; background:var(--plum-2); font-size:18px; opacity:.6;}
        .add{width:100%; padding:13px; border-radius:13px; border:2px dashed var(--plum-3);
             font-weight:800; font-size:14px; opacity:.7;}
        .segs{display:flex; gap:8px; flex-wrap:wrap;}
        .seg{flex:1; min-width:56px; padding:14px 6px; border-radius:13px; background:var(--plum-2);
             border:1.5px solid rgba(246,238,223,.07); font-weight:800; font-size:16px; font-variant-numeric:tabular-nums;
             transition:transform .06s ease, background .12s ease, color .12s ease;}
        .seg:active{transform:scale(.97);}
        .seg.small{font-size:13px; line-height:1.25; min-width:120px;}
        .segs.trio .seg{min-width:0;}
        .seg.on{background:var(--paper); color:var(--plum); border-color:var(--paper); box-shadow:0 4px 14px -6px rgba(0,0,0,.5);}
        .note{margin-top:10px; font-size:12.5px; line-height:1.45; opacity:.55;}

        .stepper{display:flex; align-items:center; gap:12px;}
        .stepper .step{width:56px; height:56px; flex:0 0 auto; border-radius:14px; background:var(--plum-2);
              font-family:var(--display); font-size:26px; line-height:1; display:grid; place-items:center;
              transition:transform .06s ease;}
        .stepper .step:active{transform:scale(.92);}
        .stepper .step:disabled{opacity:.28; transform:none;}
        .stepper .val{flex:1; text-align:center; font-family:var(--display); font-size:34px; line-height:1;
              color:var(--marigold); font-variant-numeric:tabular-nums;}
        .stepper .val span{font-family:var(--body); font-size:15px; font-weight:800; opacity:.55; margin-left:3px;}

        .over{flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center;
              text-align:center; padding:24px;}
        .over h2{font-family:var(--display); font-size:clamp(30px,10vw,56px); color:var(--marigold); text-transform:uppercase; line-height:1;}
        .board{width:100%; max-width:340px; margin:22px 0 0; display:flex; flex-direction:column; gap:8px;}
        .row{display:flex; align-items:center; gap:13px; padding:13px 15px; border-radius:13px; background:var(--plum-2);}
        .row .rank{width:26px; height:26px; flex:0 0 auto; border-radius:8px; display:grid; place-items:center;
              font-family:var(--display); font-size:14px; line-height:1; background:var(--plum-3); color:var(--paper); opacity:.65;}
        .row b{flex:1; text-align:left; font-weight:800; font-size:15px;}
        .row i{font-style:normal; font-family:var(--display); font-size:18px; color:var(--marigold); font-variant-numeric:tabular-nums;}
        .row.gold{background:linear-gradient(180deg, rgba(255,201,60,.15), var(--plum-2)); box-shadow:inset 0 0 0 1.5px rgba(255,201,60,.4);}
        .row.gold .rank{background:var(--marigold); color:var(--plum); opacity:1;}
        .row.silver .rank{background:var(--paper); color:var(--plum); opacity:.85;}
        .foot{padding:14px 16px calc(16px + env(safe-area-inset-bottom));
              background:linear-gradient(180deg, rgba(30,16,54,0) 0%, var(--plum) 42%);}

        .modal{position:absolute; inset:0; z-index:30; display:grid; place-items:center; padding:26px;
               background:rgba(15,8,28,.74); -webkit-backdrop-filter:blur(3px); backdrop-filter:blur(3px);}
        .sheet{width:100%; max-width:330px; background:var(--plum-2); border-radius:20px; padding:24px 22px;
               text-align:center; box-shadow:var(--lift);}
        .sheet h3{font-family:var(--display); font-size:22px; text-transform:uppercase; color:var(--marigold); line-height:1.05;}
        .sheet p{font-size:13.5px; opacity:.72; margin-top:11px; line-height:1.5;}
        .sheet .acts{display:flex; gap:10px; margin-top:22px;}
        .sheet .acts .big{flex:1; font-size:16px; padding:15px;}
        @media (prefers-reduced-motion:no-preference){ .sheet{animation:pop .2s cubic-bezier(.2,1.2,.4,1);} }
      `}</style>

      {/* ---------------- USTAWIENIA ---------------- */}
      {phase === "setup" && (
        <>
          <div className="setup">
            <div className="logo">
              Na
              <em>Literę</em>
            </div>
            <p className="tag">
              Podaj telefon dalej i myśl szybko! Kategoria na ekranie, zegar leci. Powiedz słowo
              i złap jego pierwszą literę, nim skończy się czas.
            </p>

            <div className="field">
              <label>Kategorie</label>
              <div className="segs trio">
                <button
                  className={"seg small" + (mode === "all" ? " on" : "")}
                  onClick={() => {
                    setMode("all");
                    setLimit(10);
                    setMissRule("skip");
                  }}
                >
                  Wszyscy
                </button>
                <button
                  className={"seg small" + (mode === "kids" ? " on" : "")}
                  onClick={() => {
                    setMode("kids");
                    setLimit(15);
                    setMissRule("life");
                  }}
                >
                  Dzieci 7+
                </button>
                <button
                  className={"seg small" + (mode === "adult" ? " on" : "")}
                  onClick={() => {
                    setMode("adult");
                    setLimit(10);
                    setMissRule("skip");
                  }}
                >
                  18+
                </button>
              </div>
              {mode === "kids" && <p className="note">Łatwiejsze hasła, więcej czasu i bez wypadania z rundy.</p>}
              {mode === "adult" && <p className="note">Hasła dla dorosłych. Tylko dla imprez 18+.</p>}
            </div>

            <div className="field">
              <label>Gracze</label>
              {names.map((n, i) => (
                <div className="nameRow" key={i}>
                  <input
                    value={n}
                    maxLength={14}
                    onChange={(e) => {
                      const copy = [...names];
                      copy[i] = e.target.value;
                      setNames(copy);
                    }}
                  />
                  {names.length > 1 && (
                    <button className="del" aria-label="Usuń gracza" onClick={() => setNames(names.filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {names.length < 8 && (
                <button className="add" onClick={() => setNames([...names, `Gracz ${names.length + 1}`])}>
                  + Dodaj gracza
                </button>
              )}
            </div>

            <div className="field">
              <label>Sekundy na turę</label>
              <div className="stepper">
                <button
                  className="step"
                  aria-label="Mniej czasu"
                  disabled={limit <= 3}
                  onClick={() => setLimit((s) => Math.max(3, s - 1))}
                >
                  −
                </button>
                <div className="val">{limit}<span>s</span></div>
                <button
                  className="step"
                  aria-label="Więcej czasu"
                  disabled={limit >= 20}
                  onClick={() => setLimit((s) => Math.min(20, s + 1))}
                >
                  +
                </button>
              </div>
            </div>

            <div className="field">
              <label>Między turami</label>
              <div className="segs">
                <button className={"seg small" + (instant ? " on" : "")} onClick={() => setInstant(true)}>
                  Bez przerwy
                </button>
                <button className={"seg small" + (!instant ? " on" : "")} onClick={() => setInstant(false)}>
                  Dotknij, by ruszyć
                </button>
              </div>
            </div>

            <div className="field">
              <label>Gdy nie zdążysz</label>
              <div className="segs">
                <button className={"seg small" + (missRule === "skip" ? " on" : "")} onClick={() => setMissRule("skip")}>
                  Pauza do końca rundy
                </button>
                <button className={"seg small" + (missRule === "life" ? " on" : "")} onClick={() => setMissRule("life")}>
                  Tylko tracisz życie
                </button>
              </div>
            </div>

            <div className="field">
              <label>Życia na gracza</label>
              <div className="stepper">
                <button
                  className="step"
                  aria-label="Mniej żyć"
                  disabled={startLives <= 1}
                  onClick={() => setStartLives((l) => Math.max(1, l - 1))}
                >
                  −
                </button>
                <div className="val">{startLives}</div>
                <button
                  className="step"
                  aria-label="Więcej żyć"
                  disabled={startLives >= 9}
                  onClick={() => setStartLives((l) => Math.min(9, l + 1))}
                >
                  +
                </button>
              </div>
            </div>
          </div>
          <div className="foot">
            <button className="big" onClick={startGame}>Zaczynamy</button>
          </div>
        </>
      )}

      {/* ---------------- GRA ---------------- */}
      {(phase === "ready" || phase === "live" || phase === "result" || phase === "roundend") && (
        <>
          <div className="bar">
            <div className="round-tag"><u>Runda</u><b>{round}</b></div>
            {mode === "kids" && <span className="mode-pill kids">Dzieci 7+</span>}
            {mode === "adult" && <span className="mode-pill adult">18+</span>}
            <div className="chip">
              <button
                className="icon"
                aria-label={soundOn ? "Wyłącz dźwięk" : "Włącz dźwięk"}
                aria-pressed={!soundOn}
                onClick={() => setSoundOn((s) => !s)}
              >
                {soundOn ? <VolumeOnIcon /> : <VolumeOffIcon />}
              </button>
              <button className="icon" aria-label="Zakończ grę" onClick={() => setPhase("setup")}>
                <CloseIcon />
              </button>
            </div>
          </div>

          <div className="cat"><h1>{category}</h1></div>

          {phase !== "live" && (
            <div className="strip">
              {players.map((p, i) => (
                <div
                  key={i}
                  className={
                    "pcard" +
                    (i === current ? " on" : "") +
                    (p.lives <= 0 ? " dead" : p.skipped ? " skip" : "")
                  }
                >
                  <div className="pname">{p.name}</div>
                  <div className="pmeta">
                    <span className="pscore">{p.score}</span>
                    <span className="hearts">
                      {Array.from({ length: startLives }).map((_, h) => (
                        <span key={h} className={"heart" + (h < p.lives ? "" : " gone")} />
                      ))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="stage">
            {phase === "ready" && (
              <div className="handoff">
                <span>twoja kolej</span>
                <b>{players[current]?.name}</b>
                <em><i>{openCount}</i> wolnych liter</em>
              </div>
            )}

            {(phase === "live" || phase === "result" || phase === "roundend") && (
              <>
                <div className="marquee">
                  {Array.from({ length: BULBS }).map((_, i) => {
                    const on = phase === "live" && i < litBulbs;
                    return <span key={i} className={"bulb" + (on ? (panic ? " hot" : "") : " off")} />;
                  })}
                </div>
                <div className="whoami">
                  <b>{players[current]?.name}</b>
                  <span className="hearts">
                    {Array.from({ length: startLives }).map((_, h) => (
                      <span key={h} className={"heart" + (h < (players[current]?.lives ?? 0) ? "" : " gone")} />
                    ))}
                  </span>
                </div>
                {firstTurn && (
                  <div className={"hint" + (panic ? " hot" : "")}>Powiedz słowo i dotknij jego litery</div>
                )}
                <div className="grid">
                  {ALPHABET.map((L) => (
                    <button
                      key={L}
                      className={"tile" + (taken[L] ? " used" : "")}
                      disabled={!!taken[L]}
                      onClick={() => claim(L)}
                    >
                      {L}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="foot">
            {phase === "ready" ? (
              <button className="big" onClick={goLive}>Start</button>
            ) : (
              <button className="big ghost" onClick={askSkip} disabled={phase !== "live"}>
                Nowa kategoria
              </button>
            )}
          </div>

          {phase === "result" && result && (
            <div className={"flash " + (result.ok ? "good" : "bad")}>
              <div>
                <h2>{result.ok ? "JEST!" : "ZA WOLNO"}</h2>
                <p>{result.name}{result.letter ? ` · ${result.letter}` : ""}</p>
                {result.skipped && <p>pauza do końca rundy</p>}
                {result.next && <p className="up">Teraz — {result.next}</p>}
              </div>
            </div>
          )}

          {confirmSkip && (
            <div className="modal" onClick={cancelSkip}>
              <div className="sheet" onClick={(e) => e.stopPropagation()}>
                <h3>Nowa kategoria?</h3>
                <p>Wylosujemy inne hasło, a zegar ruszy od nowa. Zajęte litery zostają.</p>
                <div className="acts">
                  <button className="big ghost" onClick={cancelSkip}>Anuluj</button>
                  <button className="big" onClick={skipCategory}>Losuj</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {phase === "roundend" && banner && (
        <div className="flash round">
          <div>
            <h2>Koniec rundy</h2>
            {banner.survivor ? (
              <>
                <p className="up">{banner.survivor}</p>
                <p>zostaje na placu boju</p>
              </>
            ) : (
              <p>wszystkie litery zajęte</p>
            )}
          </div>
        </div>
      )}

      {/* ---------------- KONIEC GRY ---------------- */}
      {phase === "over" && (
        <>
          <div className="over">
            <h2>{winner ? `${winner.name} wygrywa` : "Koniec gry"}</h2>
            <div className="board">
              {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
                <div className={"row" + (i === 0 ? " gold" : i === 1 ? " silver" : "")} key={i}>
                  <span className="rank">{i + 1}</span>
                  <b>{p.name}</b>
                  <i>{p.score}</i>
                </div>
              ))}
            </div>
          </div>
          <div className="foot">
            <button className="big" onClick={startGame}>Jeszcze raz</button>
          </div>
        </>
      )}
    </div>
  );
}
