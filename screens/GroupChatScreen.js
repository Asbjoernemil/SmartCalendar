// screens/GroupChatScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { GiftedChat } from 'react-native-gifted-chat';
import { View, ActivityIndicator } from 'react-native';
import { db, auth } from '../services/firebase';  // Ret sti hvis nødvendig
import {
    collection,
    doc,
    getDoc,
    addDoc,
    orderBy,
    query,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';
import { useIsFocused } from '@react-navigation/native';

/**
 * GroupChatScreen:
 *  - Viser chat i realtid for specifik gruppe (groupId).
 *  - 'GiftedChat' som chat-UI.
 *  - Lytter på subcollection 'groups/<groupId>/chatMessages' i Firestore.
 */
export default function GroupChatScreen({ route }) {
    const { groupId } = route.params;
    const [messages, setMessages] = useState([]);
    // isFocused -> reaktiverer, når tilbage til skærmen
    const isFocused = useIsFocused();
    const [loading, setLoading] = useState(true);

    /**
     * useEffect:
     *  - Når skærmen er fokuseret og groupId er sat,
     *    lytter på 'chatMessages' subcollection i Firestore med onSnapshot.
     */
    useEffect(() => {
        if (!groupId || !isFocused) return;

        const chatRef = collection(db, 'groups', groupId, 'chatMessages');
        const q = query(chatRef, orderBy('createdAt', 'desc'));

        // onSnapshot -> realtid, kører når data ændrer sig
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const loadedMsgs = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();

                // GiftedChat-format: { _id, text, createdAt, user: { _id, name, ... } }
                loadedMsgs.push({
                    _id: docSnap.id, // chat-docs ID
                    text: data.text, // selve beskedteksten
                    createdAt: data.createdAt?.toDate() ?? new Date(),
                    user: {
                        _id: data.userId,// Ejerens UID
                        name: data.userName ?? data.userId, // Fallback til userId, hvis ingen userName
                    },
                });
            });
            setMessages(loadedMsgs);
            setLoading(false);
        });

        // Rydder op ved unmount eller når skærmen ikke længere er fokuseret
        return () => unsubscribe();
    }, [groupId, isFocused]);

    /**
     * onSend:
     *  - Kaldes af GiftedChat, når USer sender en ny besked.
     *  - Opretter et nyt doc i subcollectionen 'chatMessages'
     *    med text, userId, userName, createdAt = serverTimestamp.
     */
    const onSend = useCallback(async (msgs = []) => {
        if (!msgs.length) return; // Ingen besked

        const msg = msgs[0]; // GiftedChat sender et array med 1...n beskeder
        const user = auth.currentUser;
        if (!user) return;

        // Hent brugerens displayName fra userDoc
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);

        let userName = user.uid;
        if (userSnap.exists()) {
            const userData = userSnap.data();
            userName = userData.displayName || user.email || user.uid;
        }

        // Gem ny besked i 'groups/<groupId>/chatMessages'
        const chatRef = collection(db, 'groups', groupId, 'chatMessages');
        await addDoc(chatRef, {
            text: msg.text,
            userId: user.uid,
            userName: userName,
            createdAt: serverTimestamp()
        });
    }, [groupId]);

    // Mens load data, vis en spinner
    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    // GiftedChat UI
    return (
        <GiftedChat
            messages={messages} // De beskeder, som er i state
            onSend={(msgs) => onSend(msgs)}  // Callback, når brugeren sender
            user={{
                _id: auth.currentUser?.uid, // Hvem er jeg i chatten?
            }}
        />
    );
}