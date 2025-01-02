import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, FlatList } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import {
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    collection,
    onSnapshot,
    addDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { formatTime } from '../../utils/dateUtils';
import { Picker } from '@react-native-picker/picker';

export default function EventDetailsScreen({ route, navigation }) {
    const { eventId } = route.params;
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date());
    const [startHour, setStartHour] = useState(12);
    const [startMinute, setStartMinute] = useState(0);
    const [endHour, setEndHour] = useState(13);
    const [endMinute, setEndMinute] = useState(0);

    const [isEditing, setIsEditing] = useState(false);
    const [canEdit, setCanEdit] = useState(false);

    const [ownerDisplayName, setOwnerDisplayName] = useState('');

    // Kommentar-relaterede states
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');

    const hours = [...Array(24).keys()];
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    useEffect(() => {
        const fetchEvent = async () => {
            const docRef = doc(db, 'events', eventId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const eventData = docSnap.data();
                setTitle(eventData.title || '');
                setDescription(eventData.description || '');

                // Hent ejeren
                const eventOwnerId = eventData.userId;
                setCanEdit(eventOwnerId === auth.currentUser?.uid);

                // Hent ejerens displayName
                const userDocRef = doc(db, 'users', eventOwnerId);
                const userSnap = await getDoc(userDocRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    setOwnerDisplayName(userData.displayName || eventOwnerId);
                } else {
                    setOwnerDisplayName(eventOwnerId);
                }

                // Tider
                if (eventData.startTime && eventData.endTime) {
                    const startTime = new Date(eventData.startTime);
                    const endTime = new Date(eventData.endTime);
                    if (!isNaN(startTime) && !isNaN(endTime)) {
                        setDate(startTime);
                        const sh = startTime.getHours();
                        const sm = startTime.getMinutes();
                        const eh = endTime.getHours();
                        const em = endTime.getMinutes();

                        // Justér til nærmeste 5-min interval?
                        const closestStartMin = minutes.reduce((prev, curr) =>
                            Math.abs(curr - sm) < Math.abs(prev - sm) ? curr : prev
                        );
                        const closestEndMin = minutes.reduce((prev, curr) =>
                            Math.abs(curr - em) < Math.abs(prev - em) ? curr : prev
                        );

                        setStartHour(sh);
                        setStartMinute(closestStartMin);
                        setEndHour(eh);
                        setEndMinute(closestEndMin);
                    }
                }
            } else {
                Alert.alert('Fejl', 'Aftalen blev ikke fundet.');
                navigation.goBack();
            }
        };

        fetchEvent();
    }, [eventId]);

    useEffect(() => {
        // Lyt til kommentarer i en subcollection
        const commentsRef = collection(db, 'events', eventId, 'comments');
        const unsubscribe = onSnapshot(commentsRef, (snapshot) => {
            const newComments = [];
            snapshot.forEach((docSnap) => {
                newComments.push({
                    id: docSnap.id,
                    ...docSnap.data(),
                });
            });
            // Sortér evt. kommentarer efter timestamp
            newComments.sort((a, b) => {
                if (!a.timestamp || !b.timestamp) return 0;
                return a.timestamp.toDate() - b.timestamp.toDate();
            });
            setComments(newComments);
        });

        return () => unsubscribe();
    }, [eventId]);

    const handleUpdateEvent = async () => {
        const dateString = date.toISOString().split('T')[0];
        const updatedStart = new Date(dateString);
        updatedStart.setHours(startHour, startMinute, 0, 0);
        const updatedEnd = new Date(dateString);
        updatedEnd.setHours(endHour, endMinute, 0, 0);

        if (updatedEnd <= updatedStart) {
            Alert.alert('Ugyldig tid', 'Sluttiden skal være efter starttiden.');
            return;
        }

        try {
            const docRef = doc(db, 'events', eventId);
            await updateDoc(docRef, {
                title,
                description,
                startTime: updatedStart.toISOString(),
                endTime: updatedEnd.toISOString(),
            });
            Alert.alert('Succes', 'Aftalen er opdateret.');
            setIsEditing(false);
        } catch (error) {
            console.log('Fejl ved opdatering af aftale:', error);
            Alert.alert('Fejl', 'Kunne ikke opdatere aftalen. Prøv igen.');
        }
    };

    const handleDeleteEvent = async () => {
        Alert.alert(
            'Bekræft sletning',
            'Er du sikker på, at du vil slette denne aftale?',
            [
                { text: 'Annuller', style: 'cancel' },
                {
                    text: 'Slet',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const docRef = doc(db, 'events', eventId);
                            await deleteDoc(docRef);
                            Alert.alert('Succes', 'Aftalen er slettet.');
                            navigation.goBack();
                        } catch (error) {
                            console.log('Fejl ved sletning af aftale:', error);
                            Alert.alert('Fejl', 'Kunne ikke slette aftalen. Prøv igen.');
                        }
                    },
                },
            ]
        );
    };

    const displayedStartTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        startHour,
        startMinute
    );
    const displayedEndTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        endHour,
        endMinute
    );

    // 1) Her henter du displayName, når du tilføjer en kommentar
    const handleAddComment = async () => {
        if (!commentText.trim()) return;

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

        const commentsRef = collection(db, 'events', eventId, 'comments');
        try {
            await addDoc(commentsRef, {
                text: commentText.trim(),
                userId: user.uid,
                userName: userName,            // <--- gemmer brugerens navn
                timestamp: serverTimestamp(),
            });
            setCommentText('');
        } catch (error) {
            console.log('Fejl ved tilføjelse af kommentar:', error);
            Alert.alert('Fejl', 'Kunne ikke tilføje kommentar. Prøv igen.');
        }
    };

    // 2) Her viser du userName i stedet for userId
    const renderComment = ({ item }) => {
        const timeString = item.timestamp ? formatTime(item.timestamp.toDate()) : '';
        return (
            <View style={styles.commentContainer}>
                <Text style={styles.commentUser}>
                    {item.userName || item.userId}
                </Text>
                <Text style={styles.commentText}>{item.text}</Text>
                <Text style={styles.commentTime}>{timeString}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {isEditing && canEdit ? (
                <>
                    <TextInput
                        label="Titel"
                        value={title}
                        onChangeText={setTitle}
                        style={styles.textInput}
                    />
                    <TextInput
                        label="Beskrivelse"
                        value={description}
                        onChangeText={setDescription}
                        style={styles.textInput}
                        multiline
                    />
                    <Text style={{ marginBottom: 5 }}>Starttid: {formatTime(displayedStartTime)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                        <Picker
                            selectedValue={startHour}
                            style={{ height: 50, width: 80 }}
                            onValueChange={(itemValue) => setStartHour(itemValue)}
                        >
                            {hours.map((h) => (
                                <Picker.Item key={h} label={h.toString()} value={h} />
                            ))}
                        </Picker>
                        <Text style={{ marginHorizontal: 5 }}>:</Text>
                        <Picker
                            selectedValue={startMinute}
                            style={{ height: 50, width: 80 }}
                            onValueChange={(itemValue) => setStartMinute(itemValue)}
                        >
                            {minutes.map((m) => (
                                <Picker.Item key={m} label={m.toString()} value={m} />
                            ))}
                        </Picker>
                    </View>

                    <Text style={{ marginBottom: 5 }}>Sluttid: {formatTime(displayedEndTime)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                        <Picker
                            selectedValue={endHour}
                            style={{ height: 50, width: 80 }}
                            onValueChange={(itemValue) => setEndHour(itemValue)}
                        >
                            {hours.map((h) => (
                                <Picker.Item key={h} label={h.toString()} value={h} />
                            ))}
                        </Picker>

                        <Text style={{ marginHorizontal: 5 }}>:</Text>

                        <Picker
                            selectedValue={endMinute}
                            style={{ height: 50, width: 80 }}
                            onValueChange={(itemValue) => setEndMinute(itemValue)}
                        >
                            {minutes.map((m) => (
                                <Picker.Item key={m} label={m.toString()} value={m} />
                            ))}
                        </Picker>
                    </View>
                </>
            ) : (
                <>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.description}>{description}</Text>
                    <Text style={styles.time}>Start: {formatTime(displayedStartTime)}</Text>
                    <Text style={styles.time}>Slut: {formatTime(displayedEndTime)}</Text>
                    <Text style={styles.time}>Oprettet af: {ownerDisplayName}</Text>
                </>
            )}

            <View style={styles.buttonContainer}>
                {canEdit && (
                    isEditing ? (
                        <Button mode="contained" onPress={handleUpdateEvent} style={styles.button}>
                            Gem
                        </Button>
                    ) : (
                        <Button mode="contained" onPress={() => setIsEditing(true)} style={styles.button}>
                            Rediger
                        </Button>
                    )
                )}
                {canEdit && (
                    <Button mode="contained" onPress={handleDeleteEvent} style={styles.button}>
                        Slet
                    </Button>
                )}
            </View>

            {/* Kommentar-sektion */}
            <Text style={{ fontSize: 18, marginVertical: 10 }}>Kommentarer</Text>
            <FlatList
                data={comments}
                renderItem={renderComment}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={<Text>Ingen kommentarer endnu.</Text>}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <TextInput
                    label="Ny kommentar"
                    value={commentText}
                    onChangeText={setCommentText}
                    style={{ flex: 1, marginRight: 10 }}
                />
                <Button mode="contained" onPress={handleAddComment}>
                    Tilføj
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    textInput: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        marginBottom: 20,
    },
    description: {
        fontSize: 16,
        marginBottom: 10,
    },
    time: {
        fontSize: 16,
        marginBottom: 5,
    },
    buttonContainer: {
        flexDirection: 'row',
        marginTop: 20,
    },
    button: {
        marginRight: 10,
    },
    commentContainer: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 5,
        marginVertical: 5,
    },
    commentUser: {
        fontWeight: 'bold',
    },
    commentText: {
        marginVertical: 5,
    },
    commentTime: {
        fontSize: 12,
        color: '#555',
    },
});
