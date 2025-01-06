import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, FlatList } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { doc, getDoc, updateDoc, deleteDoc, collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { Picker } from '@react-native-picker/picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

// EventDetailsScreen viser detaljer for et enkelt event.
export default function EventDetailsScreen({ route, navigation }) {
    // eventId modtages fra navigation ( DayEventsScreen eller Agenda).
    const { eventId } = route.params;

    // State til at gemme eventets titel, beskrivelse, dato mm.
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date());  // bruges til at vise/ændre dato i datepicker
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    // Start- og sluttid, i timer og minutter.
    const [startHour, setStartHour] = useState(12);
    const [startMinute, setStartMinute] = useState(0);
    const [endHour, setEndHour] = useState(13);
    const [endMinute, setEndMinute] = useState(0);

    // Styrer, "redigerings-tilstand" og om User har ret til at redigere.
    const [isEditing, setIsEditing] = useState(false);
    const [canEdit, setCanEdit] = useState(false);

    // Navn gemmes (displayName) på User, der oprettede aftalen.
    const [ownerDisplayName, setOwnerDisplayName] = useState('');

    // Kommentar state (liste kommentarer, + inputfelt).
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');

    // Helper lister til <Picker>, kan vælge timetal og minutter.
    const hours = [...Array(24).keys()];
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    /**
     * useEffect #1:
     * - Henter event-document fra Firestore (hvis findes).
     * - Gemmer titel, beskrivelse, tidsdata mm. i state.
     * - Checker, om nuværende User er ejeren af eventet (canEdit).
     */
    useEffect(() => {
        const fetchEvent = async () => {
            const docRef = doc(db, 'events', eventId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const eventData = docSnap.data();

                // Sæt titel og beskrivelse i state.
                setTitle(eventData.title || '');
                setDescription(eventData.description || '');

                // Tjek, om den aktuelle User er eventets ejer (userId).
                const eventOwnerId = eventData.userId;
                setCanEdit(eventOwnerId === auth.currentUser?.uid);

                // Hent ejerens displayName (fra users/<userId>).
                const userDocRef = doc(db, 'users', eventOwnerId);
                const userSnap = await getDoc(userDocRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    // Brug enten displayName eller eventOwnerId som fallback.
                    setOwnerDisplayName(userData.displayName || eventOwnerId);
                } else {
                    setOwnerDisplayName(eventOwnerId);
                }

                // Hent start- og sluttid, og sæt dem i state, hvis de findes.
                if (eventData.startTime && eventData.endTime) {
                    const startTime = new Date(eventData.startTime);
                    const endTime = new Date(eventData.endTime);
                    // Tjek om er "valide" datoer
                    if (!isNaN(startTime) && !isNaN(endTime)) {
                        // Vælg startTime's DATO som "date" i state.
                        setDate(startTime);
                        // Sæt timer/minutter for start- og sluttid.
                        setStartHour(startTime.getHours());
                        setStartMinute(startTime.getMinutes());
                        setEndHour(endTime.getHours());
                        setEndMinute(endTime.getMinutes());
                    }
                }
            } else {
                Alert.alert('Fejl', 'Aftalen blev ikke fundet.');
                navigation.goBack();
            }
        };
        fetchEvent();
    }, [eventId]);

    /**
     * useEffect #2:
     * - Lytter på subcollection 'comments' realtid
     *   (via onSnapshot), hele tiden får nye kommentarer uden at refreshe.
     */
    useEffect(() => {
        const commentsRef = collection(db, 'events', eventId, 'comments');
        const unsubscribe = onSnapshot(commentsRef, (snapshot) => {
            const newComments = [];
            snapshot.forEach((docSnap) => {
                newComments.push({ id: docSnap.id, ...docSnap.data() });
            });
            // Sortér kommentarerne kronologisk efter timestamp
            newComments.sort((a, b) => {
                if (!a.timestamp || !b.timestamp) return 0;
                return a.timestamp.toDate() - b.timestamp.toDate();
            });
            setComments(newComments);
        });
        // Stopper, når komponenten unmountes
        return () => unsubscribe();
    }, [eventId]);

    /**
     * Dato-picker til at opdatere eventets dato.
     */
    const showDatePicker = () => setDatePickerVisibility(true);
    const hideDatePicker = () => setDatePickerVisibility(false);
    const handleDatePicked = (pickedDate) => {
        hideDatePicker();
        if (pickedDate) setDate(pickedDate);
    };

    /**
     * handleUpdateEvent:
     * - Når User bekræfter redigering, opdateres doc i Firestore
     *   ny titel, beskrivelses og tid.
     */
    const handleUpdateEvent = async () => {
        // Lav en string "YYYY-MM-DD" fra date-state
        const dateString = date.toISOString().split('T')[0];

        //start-/sluttid (JS Date), sat til kl. (startHour, startMinute).
        const updatedStart = new Date(dateString);
        updatedStart.setHours(startHour, startMinute, 0, 0);

        const updatedEnd = new Date(dateString);
        updatedEnd.setHours(endHour, endMinute, 0, 0);

        // Tjek sluttid > starttid
        if (updatedEnd <= updatedStart) {
            Alert.alert('Ugyldig tid', 'Sluttiden skal være efter starttiden.');
            return;
        }

        try {
            // Opdater doc i 'events' collection
            const docRef = doc(db, 'events', eventId);
            await updateDoc(docRef, {
                title,
                description,
                startTime: updatedStart.toISOString(),
                endTime: updatedEnd.toISOString(),
                date: dateString
            });
            Alert.alert('OK', 'Aftalen er opdateret');
            setIsEditing(false); // Luk redigering
        } catch (error) {
            console.log('Fejl ved opdatering:', error);
            Alert.alert('Fejl', 'Kunne ikke opdatere. Prøv igen.');
        }
    };

    /**
     * handleDeleteEvent:
     * - Alert for at bekræfte sletning.
     * - Sletter derefter dokumentet i Firestore
     */
    const handleDeleteEvent = async () => {
        Alert.alert('Bekræft sletning', 'Sikker på at slette?', [
            { text: 'Annuller', style: 'cancel' },
            {
                text: 'Slet',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const docRef = doc(db, 'events', eventId);
                        await deleteDoc(docRef);
                        Alert.alert('OK', 'Aftalen er slettet');
                        navigation.goBack();
                    } catch (error) {
                        console.log(error);
                        Alert.alert('Fejl', 'Kunne ikke slette. Prøv igen.');
                    }
                },
            },
        ]);
    };

    /**
     * handleAddComment:
     * - Tilføjer kommentar (text, userId, userName, timestamp)
     *   subcollectionen 'events/<eventId>/comments'.
     */
    const handleAddComment = async () => {
        if (!commentText.trim()) return; // Tom kommentar ignoreres

        const user = auth.currentUser;
        if (!user) return;

        // Hent userName / displayName
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);

        let userName = user.uid;
        if (userSnap.exists()) {
            const userData = userSnap.data();
            userName = userData.displayName || user.email || user.uid;
        }

        const commentsRef = collection(db, 'events', eventId, 'comments');
        try {
            // Opret ny kommentar
            await addDoc(commentsRef, {
                text: commentText.trim(),
                userId: user.uid,
                userName: userName,
                timestamp: serverTimestamp(),
            });
            setCommentText('');
        } catch (err) {
            console.log(err);
            Alert.alert('Fejl', 'Kunne ikke tilføje kommentar.');
        }
    };

    /**
     * renderComment:
     * - FlatList callback, der viser hver enkelt kommentar med userName og tid.
     */
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

    // "displayedStartTime", "displayedEndTime" bruges i UI-teksten
    // (formatTime) under "Rediger" eller "Vis".
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

    return (
        <View style={styles.container}>

            {/**
       * Viser redigeringsfelter (hvis isEditing == true og User må redigere),
       * eller tilstand "vis" med titel, beskrivelse, tidspunkter osv.
       */}
            {isEditing && canEdit ? (
                <>
                    {/* Redigeringstilstand: Vis TextInputs og Pickers */}
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

                    {/* Knap til ny dato via datepicker */}
                    <Button onPress={showDatePicker} style={styles.dateButton}>
                        Vælg dato: {date.toISOString().split('T')[0]}
                    </Button>
                    <DateTimePickerModal
                        isVisible={isDatePickerVisible}
                        mode="date"
                        date={date}
                        onConfirm={handleDatePicked}
                        onCancel={hideDatePicker}
                    />

                    {/* Picker til starttid */}
                    <Text style={{ marginBottom: 5 }}>
                        Starttid: {formatTime(displayedStartTime)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                        <Picker
                            selectedValue={startHour}
                            style={{ height: 50, width: 80 }}
                            onValueChange={(val) => setStartHour(val)}
                        >
                            {hours.map((h) => (
                                <Picker.Item key={h} label={h.toString()} value={h} />
                            ))}
                        </Picker>
                        <Text style={{ marginHorizontal: 5 }}>:</Text>
                        <Picker
                            selectedValue={startMinute}
                            style={{ height: 50, width: 80 }}
                            onValueChange={(val) => setStartMinute(val)}
                        >
                            {minutes.map((m) => (
                                <Picker.Item key={m} label={m.toString()} value={m} />
                            ))}
                        </Picker>
                    </View>

                    {/* Picker til sluttid */}
                    <Text style={{ marginBottom: 5 }}>
                        Sluttid: {formatTime(displayedEndTime)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                        <Picker
                            selectedValue={endHour}
                            style={{ height: 50, width: 80 }}
                            onValueChange={(val) => setEndHour(val)}
                        >
                            {hours.map((h) => (
                                <Picker.Item key={h} label={h.toString()} value={h} />
                            ))}
                        </Picker>
                        <Text style={{ marginHorizontal: 5 }}>:</Text>
                        <Picker
                            selectedValue={endMinute}
                            style={{ height: 50, width: 80 }}
                            onValueChange={(val) => setEndMinute(val)}
                        >
                            {minutes.map((m) => (
                                <Picker.Item key={m} label={m.toString()} value={m} />
                            ))}
                        </Picker>
                    </View>
                </>
            ) : (
                <>
                    {/* "læsetilstand": Titel, beskrivelse, tidsinfo, hvem der oprettede eventet */}
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.description}>{description}</Text>
                    <Text style={styles.time}>Dato: {date.toISOString().split('T')[0]}</Text>
                    <Text style={styles.time}>Start: {formatTime(displayedStartTime)}</Text>
                    <Text style={styles.time}>Slut: {formatTime(displayedEndTime)}</Text>
                    <Text style={styles.time}>Oprettet af: {ownerDisplayName}</Text>
                </>
            )}

            {/* Knapper redigering og sletning (hvis canEdit == true) */}
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

            {/* Kommentar-sektionen */}
            <Text style={{ fontSize: 18, marginVertical: 10 }}>Kommentarer</Text>
            <FlatList
                data={comments}
                renderItem={renderComment}
                keyExtractor={(item) => item.id}
                // Hvis der ikke er nogen kommentarer endnu
                ListEmptyComponent={<Text>Ingen kommentarer endnu.</Text>}
            />

            {/* Inputfelt + knap til at tilføje ny kommentar */}
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

// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20
    },
    textInput: {
        marginBottom: 20
    },
    title: {
        fontSize: 24,
        marginBottom: 20
    },
    description: {
        fontSize: 16,
        marginBottom: 10
    },
    time: {
        fontSize: 16,
        marginBottom: 5
    },
    buttonContainer: {
        flexDirection: 'row',
        marginTop: 20
    },
    button: {
        marginRight: 10
    },
    commentContainer: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 5,
        marginVertical: 5,
    },
    commentUser: {
        fontWeight: 'bold'
    },
    commentText: {
        marginVertical: 5
    },
    commentTime: {
        fontSize: 12,
        color: '#555'
    },
    dateButton: {
        marginBottom: 10,
        alignSelf: 'flex-start'
    },
});
