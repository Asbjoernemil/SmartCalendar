import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, TextInput, Button, Checkbox } from 'react-native-paper';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { Picker } from '@react-native-picker/picker';

// 1) Importer datepicker-modal
import DateTimePickerModal from 'react-native-modal-datetime-picker';

export default function AddEventScreen({ navigation, route }) {
    // Hvis du vil bruge selectedDate fra route, beholder du det.
    const { selectedDate } = route.params || {};
    const initialDate = selectedDate ? new Date(selectedDate) : new Date();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(initialDate);

    // State til at styre, om datepicker-modal vises
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    // Start- og sluttid
    const [startHour, setStartHour] = useState(12);
    const [startMinute, setStartMinute] = useState(0);
    const [endHour, setEndHour] = useState(13);
    const [endMinute, setEndMinute] = useState(0);

    // Her holder vi styr på grupper
    const [userGroups, setUserGroups] = useState([]); // De grupper, som brugeren er medlem af
    const [selectedGroups, setSelectedGroups] = useState([]); // De grupper, brugeren krydser af

    const hours = [...Array(24).keys()]; // [0..23]
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    // 2) Hent brugerens grupper
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert('Ikke logget ind', 'Du skal være logget ind for at oprette event.');
            navigation.navigate('Login');
            return;
        }

        (async () => {
            try {
                const userDocRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userDocRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    const groupsArr = userData.groups || [];
                    setUserGroups(groupsArr);
                } else {
                    Alert.alert('Ingen brugerdata', 'Der blev ikke fundet data for denne bruger.');
                }
            } catch (err) {
                console.log('Fejl ved hentning af brugerens grupper:', err);
            }
        })();
    }, []);

    // 3) Funktionen, der opretter selve eventet
    const handleAddEvent = async () => {
        if (selectedGroups.length === 0) {
            Alert.alert('Ingen grupper valgt', 'Vælg mindst én gruppe, der skal have eventet.');
            return;
        }

        const dateString = date.toISOString().split('T')[0];
        const startDateTime = new Date(dateString);
        startDateTime.setHours(startHour, startMinute, 0, 0);
        const startTimeString = startDateTime.toISOString();

        const endDateTime = new Date(dateString);
        endDateTime.setHours(endHour, endMinute, 0, 0);
        const endTimeString = endDateTime.toISOString();

        if (endDateTime <= startDateTime) {
            Alert.alert('Ugyldig tid', 'Sluttiden skal være efter starttiden.');
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            Alert.alert('Ikke logget ind', 'Du skal være logget ind.');
            return;
        }

        try {
            // Hent brugerfarve
            const userDocRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userDocRef);
            const userData = userSnap.exists() ? userSnap.data() : {};
            const userColor = userData.color || '#000000';

            // Opret event med alle valgte grupper
            await addDoc(collection(db, 'events'), {
                title,
                description,
                date: dateString, // lagres i Firestore
                startTime: startTimeString,
                endTime: endTimeString,
                userId: user.uid,
                userColor: userColor,
                groupIds: selectedGroups,
            });

            Alert.alert('Event oprettet!', 'Din event blev oprettet i de valgte grupper.');
            navigation.goBack();
        } catch (error) {
            console.log('Fejl ved tilføjelse af aftale:', error);
            Alert.alert('Fejl', 'Kunne ikke tilføje aftale. Prøv igen.');
        }
    };

    // 4) Datepicker-modal: Vis/Skjul og håndtér valg
    const showDatePicker = () => {
        setDatePickerVisibility(true);
    };

    const hideDatePicker = () => {
        setDatePickerVisibility(false);
    };

    // Når brugeren bekræfter en ny dato:
    const handleDateConfirm = (pickedDate) => {
        hideDatePicker();
        if (pickedDate) {
            setDate(pickedDate);
        }
    };

    // De to "visningsdatoer" for start-/slut-tid i UI
    const displayedStartTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, startMinute);
    const displayedEndTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endHour, endMinute);

    return (
        <ScrollView style={styles.container}>
            <Text variant="headlineMedium" style={{ marginBottom: 10 }}>Ny Aftale</Text>

            {/* Titel */}
            <TextInput
                label="Titel"
                value={title}
                onChangeText={setTitle}
                style={styles.textInput}
            />

            {/* Beskrivelse */}
            <TextInput
                label="Beskrivelse"
                value={description}
                onChangeText={setDescription}
                style={styles.textInput}
                multiline
            />

            {/* 5) Dato-knap + Modal DatePicker */}
            <Button onPress={showDatePicker} style={styles.dateButton}>
                Vælg dato: {formatDate(date.toISOString().split('T')[0])}
            </Button>
            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                date={date}                // start-værdi
                onConfirm={handleDateConfirm}
                onCancel={hideDatePicker}
            />

            {/* Starttid */}
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

            {/* Sluttid */}
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

            {/* Liste af brugerens grupper som checkbokse */}
            <Text variant="titleMedium" style={{ marginVertical: 10 }}>Vælg grupper:</Text>
            {userGroups.length === 0 && (
                <Text>Du er ikke medlem af nogen grupper endnu.</Text>
            )}
            {userGroups.map((gId) => {
                const checked = selectedGroups.includes(gId);
                return (
                    <Checkbox.Item
                        key={gId}
                        label={gId}
                        status={checked ? 'checked' : 'unchecked'}
                        onPress={() => {
                            if (checked) {
                                setSelectedGroups(selectedGroups.filter(id => id !== gId));
                            } else {
                                setSelectedGroups([...selectedGroups, gId]);
                            }
                        }}
                    />
                );
            })}

            <Button
                mode="contained"
                onPress={handleAddEvent}
                style={styles.button}
            >
                Tilføj aftale
            </Button>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    textInput: {
        marginBottom: 10,
    },
    dateButton: {
        marginBottom: 10,
        alignSelf: 'flex-start',
    },
    button: {
        marginVertical: 10,
    },
});
