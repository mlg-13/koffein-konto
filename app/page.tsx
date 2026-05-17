'use client';

import { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
    const router = useRouter();
    const [groupName, setGroupName] = useState("");

    const handleCreateGroup = async () => {
        if (groupName.trim()) {
            const groupRef = await addDoc(collection(db, "groups"), {
                name: groupName,
                peopleTokens: {},
                history: []
            });

            router.push(`/group/${groupRef.id}`);
        } else {
            alert("Bitte gib einen Gruppennamen ein");
        }
    };

    return (
        <div className="app-page">
            <div className="card">
                <div className="brand-row">
                    <h1>Koffein Konto</h1>

                    <Image
                        src="/logo.png"
                        alt="Koffein Konto Logo"
                        width={64}
                        height={64}
                        className="brand-logo"
                    />
                </div>
            <p>Erstelle eine neue Gruppe</p>

            <input
                type="text"
                placeholder="Gruppenname"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="input-field"
            />

            <button onClick={handleCreateGroup} className="btn primary">
                Gruppe erstellen
            </button>
        </div>
        </div>
    );
}