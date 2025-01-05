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

export default function GroupChatScreen({ route }) {
    const { groupId } = route.params;
    const [messages, setMessages] = useState([]);
    const isFocused = useIsFocused();

    const [loading, setLoading] = useState(true);

    // 1) Lyt på chat-beskederne i Firestore
    useEffect(() => {
        if (!groupId || !isFocused) return;

        const chatRef = collection(db, 'groups', groupId, 'chatMessages');
        const q = query(chatRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const loadedMsgs = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                // GiftedChat forventer format: { _id, text, createdAt, user: { _id, name, avatar? } }
                loadedMsgs.push({
                    _id: docSnap.id,
                    text: data.text,
                    createdAt: data.createdAt?.toDate() ?? new Date(),
                    user: {
                        _id: data.userId,
                        name: data.userName ?? data.userId, // Brug userName, fallback til userId
                    },
                });
            });
            setMessages(loadedMsgs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [groupId, isFocused]);

    // 2) Send ny besked -> gem i Firestore
    const onSend = useCallback(async (msgs = []) => {
        if (!msgs.length) return;

        const msg = msgs[0]; // GiftedChat sender array med 1...n beskeder
        const user = auth.currentUser;
        if (!user) return;

        // Hent brugerens displayName
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        let userName = user.uid;
        if (userSnap.exists()) {
            const userData = userSnap.data();
            userName = userData.displayName || user.email || user.uid;
        }

        const chatRef = collection(db, 'groups', groupId, 'chatMessages');
        await addDoc(chatRef, {
            text: msg.text,
            userId: user.uid,
            userName: userName,          // Gemmer displayName i feltet userName
            createdAt: serverTimestamp()
        });
    }, [groupId]);

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <GiftedChat
            messages={messages}
            onSend={(msgs) => onSend(msgs)}
            user={{
                _id: auth.currentUser?.uid, // GiftedChat sender user._id som “afsender”
            }}
        />
    );
}
