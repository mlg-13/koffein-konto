'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/app/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Image from "next/image";

export default function GroupPage() {
    const params = useParams();
    const groupId = params.groupId as string;

    const [groupName, setGroupName] = useState("");
    const [savedName, setSavedName] = useState<string | null | undefined>(undefined);
    const [nameInput, setNameInput] = useState("");
    const [history, setHistory] = useState<string[]>([]);
    const [presentPeople, setPresentPeople] = useState<string[]>([]);
    const [showPaymentArea, setShowPaymentArea] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const [peopleTokens, setPeopleTokens] = useState<{ [key: string]: number }>({});

    const peopleNames = Object.keys(peopleTokens);

    const lowestToken = peopleNames.length > 0
        ? Math.min(...peopleNames.map((person) => peopleTokens[person]))
        : null;

    const lowestPeople = lowestToken !== null
        ? peopleNames.filter((person) => peopleTokens[person] === lowestToken)
        : [];

    useEffect(() => {
        queueMicrotask(() => {
            setSavedName(localStorage.getItem(`name-${groupId}`));
        });

        const loadGroup = async () => {
            const groupDocRef = doc(db, "groups", groupId);
            const groupDoc = await getDoc(groupDocRef);
            if (!groupDoc.exists()) {
                alert("Diese Gruppe wurde nicht gefunden.");
                return;
            }
            const data = groupDoc.data();

            if (data) {
                const loadedTokens = data.peopleTokens || {};

                setGroupName(data.name);
                setPeopleTokens(loadedTokens);
                setPresentPeople(Object.keys(loadedTokens));
                setHistory(data.history || []);
            }
        };

        loadGroup();
    }, [groupId]);

    const copyGroupLink = async () => {
        await navigator.clipboard.writeText(window.location.href);
        alert("Gruppenlink wurde kopiert.");
    };

    const joinGroup = async () => {

        if (!nameInput.trim()) {
            alert("Bitte gib deinen Namen ein.");
            return;
        }

        if (!groupName) {
            alert("Gruppe wurde nicht geladen. Prüfe den Link.");
            return;
        }

        const cleanName = nameInput.trim();

        const updatedTokens = {
            ...peopleTokens,
            [cleanName]: 0
        };

        setPeopleTokens(updatedTokens);
        setPresentPeople(Object.keys(updatedTokens));

        const groupDocRef = doc(db, "groups", groupId);

        await updateDoc(groupDocRef, {
            peopleTokens: updatedTokens
        });

        localStorage.setItem(`name-${groupId}`, cleanName);
        setSavedName(cleanName);
    };

    const togglePresentPerson = (person: string) => {
        if (presentPeople.includes(person)) {
            setPresentPeople(presentPeople.filter((name) => name !== person));
        } else {
            setPresentPeople([...presentPeople, person]);
        }
    };

    const zahlung = async (payer: string) => {
        if (!presentPeople.includes(payer)) {
            alert("Die zahlende Person muss auch als anwesend ausgewählt sein.");
            return;
        }

        if (presentPeople.length < 2) {
            alert("Es müssen mindestens zwei Personen anwesend sein.");
            return;
        }

        const otherPresentPeople = presentPeople.filter((person) => person !== payer);

        const now = new Date();

        const formattedDate = now.toLocaleString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });

        const newHistory = [
            ...history,
            `${formattedDate} — ${payer} hat bezahlt. Dabei waren: ${presentPeople.join(", ")}`
        ];

        setHistory(newHistory);

        setPeopleTokens((prevTokens) => {
            const newTokens = { ...prevTokens };

            newTokens[payer] = newTokens[payer] + otherPresentPeople.length;

            otherPresentPeople.forEach((person) => {
                newTokens[person] = newTokens[person] - 1;
            });

            const groupDocRef = doc(db, "groups", groupId);

            updateDoc(groupDocRef, {
                peopleTokens: newTokens,
                history: newHistory
            });

            return newTokens;
        });

        setShowPaymentArea(false);
    };

    if (savedName === undefined) {
        return (
            <div className="app-page">
                <div className="card">
                    <p>Lade...</p>
                </div>
            </div>
        );
    }

    if (!savedName) {
        return (
            <div className="app-page">
                <div className="card">
                    <h1>{groupName}</h1>
                    <p className="subtitle">Tritt der Gruppe bei</p>

                    <input
                        type="text"
                        placeholder="Dein Name"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="input-field"
                    />

                    <button onClick={joinGroup} className="btn primary">
                        Beitreten
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="app-page">
            <div className="card">
                <div className="top-bar">
                    <div>
                        <div className="brand-row">
                            <h1>{groupName}</h1>

                            <Image
                                src="/logo.png"
                                alt="Koffein Konto Logo"
                                width={64}
                                height={64}
                                className="brand-logo-site"
                            />
                        </div>
                        <p className="subtitle">Hallo {savedName}</p>
                    </div>

                    <button onClick={copyGroupLink} className="btn secondary">
                        Link kopieren
                    </button>
                </div>

                {lowestPeople.length > 0 && (
                    <div className="next-box">
                        <span className="label">Als Nächstes zahlen muss:</span>
                        <strong>{lowestPeople.join(", ")}</strong>
                    </div>
                )}

                <div className="section-header">
                    <h2>Teilnehmer</h2>
                    <button
                        onClick={() => setShowPaymentArea(!showPaymentArea)}
                        className="btn primary"
                    >
                        {showPaymentArea ? "Abbrechen" : "Zahlung eintragen"}
                    </button>
                </div>

                <div className="people-list">
                    {peopleNames.map((person) => (
                        <div
                            key={person}
                            className={
                                presentPeople.includes(person)
                                    ? "person-card active"
                                    : "person-card"
                            }
                            onClick={() => togglePresentPerson(person)}
                        >
                            <div>
                                <strong>{person}</strong>
                                <p>
                                    {presentPeople.includes(person)
                                        ? "Dabei"
                                        : "Nicht dabei"}
                                </p>
                            </div>

                            <span className={peopleTokens[person] < 0 ? "token negative" : "token positive"}>
                                {peopleTokens[person]}
                            </span>
                        </div>
                    ))}
                </div>

                {showPaymentArea && (
                    <div className="payment-area">
                        <h2>Wer hat bezahlt?</h2>
                        <p className="subtitle">
                            Es werden nur die ausgewählten Personen angezeigt.
                        </p>

                        <div className="button-grid">
                            {presentPeople.map((person) => (
                                <button
                                    key={person}
                                    onClick={() => zahlung(person)}
                                    className="btn primary"
                                >
                                    {person}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="section-header">
                    <h2>Verlauf</h2>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="btn secondary"
                    >
                        {showHistory ? "Ausblenden" : "Anzeigen"}
                    </button>
                </div>

                {showHistory && (
                    <div className="history-list">
                        {history.length === 0 ? (
                            <p className="subtitle">Noch keine Zahlungen.</p>
                        ) : (
                            history
                                .slice()
                                .reverse()
                                .map((entry, index) => (
                                    <div key={index} className="history-item">
                                        {entry}
                                    </div>
                                ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}