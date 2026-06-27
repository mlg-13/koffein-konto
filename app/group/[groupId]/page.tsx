'use client';

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/app/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Image from "next/image";

type Payment = {
    id: string;
    payer: string;
    presentPeople: string[];
    createdAt: string;
};

function calculateTokens(
    baseTokens: { [key: string]: number },
    members: string[],
    payments: Payment[]
) {
    const tokens: { [key: string]: number } = {};

    members.forEach((member) => {
        tokens[member] = baseTokens[member] ?? 0;
    });

    payments.forEach((payment) => {
        const otherPresentPeople = payment.presentPeople.filter(
            (person) => person !== payment.payer
        );

        tokens[payment.payer] = (tokens[payment.payer] || 0) + otherPresentPeople.length;

        otherPresentPeople.forEach((person) => {
            tokens[person] = (tokens[person] || 0) - 1;
        });
    });

    return tokens;
}

export default function GroupPage() {
    const params = useParams();
    const groupId = params.groupId as string;

    const [groupName, setGroupName] = useState("");
    const [savedName, setSavedName] = useState<string | null | undefined>(undefined);
    const [nameInput, setNameInput] = useState("");

    const [members, setMembers] = useState<string[]>([]);
    const [baseTokens, setBaseTokens] = useState<{ [key: string]: number }>({});
    const [payments, setPayments] = useState<Payment[]>([]);
    const [presentPeople, setPresentPeople] = useState<string[]>([]);

    const [showPaymentArea, setShowPaymentArea] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
    const [editPayer, setEditPayer] = useState("");
    const [editPresentPeople, setEditPresentPeople] = useState<string[]>([]);

    const peopleTokens = useMemo(() => {
        return calculateTokens(baseTokens, members, payments);
    }, [baseTokens, members, payments]);

    const lowestToken = presentPeople.length > 0
        ? Math.min(...presentPeople.map((person) => peopleTokens[person] ?? 0))
        : null;

    const lowestPeople = lowestToken !== null
        ? presentPeople.filter((person) => (peopleTokens[person] ?? 0) === lowestToken)
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
                const loadedMembers = Object.keys(loadedTokens).sort((a, b) =>
                    a.localeCompare(b, "de", { sensitivity: "base" })
                );
                const loadedPayments = data.payments || [];

                setGroupName(data.name);
                setBaseTokens(loadedTokens);
                setMembers(loadedMembers);
                setPresentPeople(loadedMembers);
                setPayments(loadedPayments);
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

        const updatedMembers = members.includes(cleanName)
            ? members
            : [...members, cleanName].sort((a, b) =>
                a.localeCompare(b, "de", { sensitivity: "base" })
            );

        const updatedBaseTokens = {
            ...baseTokens,
            [cleanName]: baseTokens[cleanName] ?? 0
        };

        const updatedTokens = calculateTokens(updatedBaseTokens, updatedMembers, payments);

        setMembers(updatedMembers);
        setBaseTokens(updatedBaseTokens);
        setPresentPeople(updatedMembers);

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



        const newPayment: Payment = {
            id: crypto.randomUUID(),
            payer,
            presentPeople: [...presentPeople],
            createdAt: new Date().toISOString()
        };

        const newPayments = [...payments, newPayment];
        const newTokens = calculateTokens(baseTokens, members, newPayments);






        setPayments(newPayments);




        const groupDocRef = doc(db, "groups", groupId);

        await updateDoc(groupDocRef, {
            payments: newPayments
        });

        setShowPaymentArea(false);
    };

    const deletePayment = async (paymentId: string) => {
        const newPayments = payments.filter((payment) => payment.id !== paymentId);
        const newTokens = calculateTokens(baseTokens, members, newPayments);

        setPayments(newPayments);

        const groupDocRef = doc(db, "groups", groupId);




        await updateDoc(groupDocRef, {
            payments: newPayments
        });


    };

    const startEditingPayment = (payment: Payment) => {
        setEditingPaymentId(payment.id);
        setEditPayer(payment.payer);
        setEditPresentPeople([...payment.presentPeople]);
    };

    const cancelEditingPayment = () => {
        setEditingPaymentId(null);
        setEditPayer("");
        setEditPresentPeople([]);
    };

    const toggleEditPresentPerson = (person: string) => {
        if (editPresentPeople.includes(person)) {
            const updatedPeople = editPresentPeople.filter(
                (name) => name !== person
            );

            setEditPresentPeople(updatedPeople);

            if (editPayer === person) {
                setEditPayer("");
            }
        } else {
            setEditPresentPeople([...editPresentPeople, person]);
        }
    };

    const saveEditedPayment = async () => {
        if (!editingPaymentId) {
            return;
        }

        if (!editPayer) {
            alert("Bitte wähle aus, wer bezahlt hat.");
            return;
        }

        if (!editPresentPeople.includes(editPayer)) {
            alert("Die zahlende Person muss auch anwesend sein.");
            return;
        }

        if (editPresentPeople.length < 2) {
            alert("Es müssen mindestens zwei Personen anwesend sein.");
            return;
        }

        const newPayments = payments.map((payment) => {
            if (payment.id !== editingPaymentId) {
                return payment;
            }

            return {
                ...payment,
                payer: editPayer,
                presentPeople: [...editPresentPeople]
            };
        });

        setPayments(newPayments);

        const groupDocRef = doc(db, "groups", groupId);

        await updateDoc(groupDocRef, {
            payments: newPayments
        });

        cancelEditingPayment();
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
                    {members.map((person) => (
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

                            <span className={(peopleTokens[person] ?? 0) < 0 ? "token negative" : "token positive"}>
                                {peopleTokens[person] ?? 0}
                            </span>
                        </div>
                    ))}
                </div>

                {showPaymentArea && (
                    <div className="payment-area">
                        {lowestPeople.length > 0 && (
                            <div className="next-box">
                                <span className="label">Als Nächstes zahlen muss:</span>
                                <strong>{lowestPeople.join(", ")}</strong>
                            </div>
                        )}

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
                        {payments.length === 0 ? (
                            <p className="subtitle">Noch keine neuen Zahlungen.</p>
                        ) : (
                            payments
                                .slice()
                                .reverse()
                                .map((payment, index) => (
                                    <div key={payment.id ?? index} className="history-item">
                                        {new Date(payment.createdAt).toLocaleString("de-DE", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        })}{" "}
                                        — {payment.payer} hat bezahlt. Dabei waren:{" "}
                                        {payment.presentPeople.join(", ")}

                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "8px",
                                                marginTop: "10px"
                                            }}
                                        >
                                            <button
                                                className="btn secondary"
                                                style={{
                                                    padding: "4px 8px",
                                                    fontSize: "13px"
                                                }}
                                                onClick={() => startEditingPayment(payment)}
                                            >
                                                Bearbeiten
                                            </button>

                                            <button
                                                className="btn secondary"
                                                style={{
                                                    padding: "4px 8px",
                                                    fontSize: "13px"
                                                }}
                                                onClick={() => deletePayment(payment.id)}
                                            >
                                                Löschen
                                            </button>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                )}
                {editingPaymentId && (
                    <div
                        className="modal-overlay"
                        onClick={cancelEditingPayment}
                    >
                        <div
                            className="modal-window"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="modal-header">
                                <div>
                                    <h2>Zahlung bearbeiten</h2>
                                    <p className="subtitle">
                                        Ändere den Zahler oder die anwesenden Personen.
                                    </p>
                                </div>

                                <button
                                    className="modal-close"
                                    onClick={cancelEditingPayment}
                                    aria-label="Fenster schließen"
                                >
                                    ×
                                </button>
                            </div>

                            <p className="subtitle">
                                Welche Personen waren bei der Zahlung dabei?
                            </p>

                            <div className="people-list modal-people-list">
                                {members.map((person) => (
                                    <div
                                        key={person}
                                        className={
                                            editPresentPeople.includes(person)
                                                ? "person-card active"
                                                : "person-card"
                                        }
                                        onClick={() => toggleEditPresentPerson(person)}
                                    >
                                        <div>
                                            <strong>{person}</strong>
                                            <p>
                                                {editPresentPeople.includes(person)
                                                    ? "Dabei"
                                                    : "Nicht dabei"}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <h2 className="modal-section-title">
                                Wer hat bezahlt?
                            </h2>

                            <div className="button-grid">
                                {editPresentPeople.map((person) => (
                                    <button
                                        key={person}
                                        className={
                                            editPayer === person
                                                ? "btn primary"
                                                : "btn secondary"
                                        }
                                        onClick={() => setEditPayer(person)}
                                    >
                                        {person}
                                    </button>
                                ))}
                            </div>

                            {editPresentPeople.length === 0 && (
                                <p className="subtitle">
                                    Wähle zuerst mindestens zwei anwesende Personen aus.
                                </p>
                            )}

                            <div className="modal-actions">
                                <button
                                    className="btn primary"
                                    onClick={saveEditedPayment}
                                >
                                    Änderung speichern
                                </button>

                                <button
                                    className="btn secondary"
                                    onClick={cancelEditingPayment}
                                >
                                    Abbrechen
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}