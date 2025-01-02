import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { Picker } from '@react-native-picker/picker';

export default function AddEventScreen({ navigation, route }) {
    const { selectedDate, groupId } = route.params || {};
    const initialDate = selectedDate ? new Date(selectedDate) : new Date();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(initialDate);

    // Starttid
    const [startHour, setStartHour] = useState(12);
    const [startMinute, setStartMinute] = useState(0);
    // Sluttid
    const [endHour, setEndHour] = useState(13);
    const [endMinute, setEndMinute] = useState(0);

    const hours = [...Array(24).keys()];
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    useEffect(() => {
        if (!groupId) {
            Alert.alert(
                'Ingen gruppe valgt',
                'Der er ingen gruppe valgt. Vælg en gruppe først.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        }
    }, [groupId]);

    if (!groupId) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Indlæser...</Text>
            </View>
        );
    }

    const handleAddEvent = async () => {
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
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userDocRef);
            const userData = userSnap.data();
            const userColor = userData && userData.color ? userData.color : '#000000';

            await addDoc(collection(db, 'events'), {
                title,
                description,
                date: dateString,
                startTime: startTimeString,
                endTime: endTimeString,
                userId: user.uid,
                userColor: userColor,
                // VIGTIGT: Vi gemmer et array af gruppe-IDs, også selvom det pt. kun er én gruppe
                groupIds: [groupId],
            });
            navigation.goBack();
        } catch (error) {
            console.log('Fejl ved tilføjelse af aftale:', error);
            Alert.alert('Fejl', 'Kunne ikke tilføje aftale. Prøv igen.');
        }
    };

    const displayedStartTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, startMinute);
    const displayedEndTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endHour, endMinute);

    return (
        <View style={styles.container}>
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

            <Button onPress={() => { }} style={styles.dateButton}>
                Vælg dato: {formatDate(date.toISOString().split('T')[0])}
            </Button>

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

            <Button mode="contained" onPress={handleAddEvent} style={styles.button}>
                Tilføj aftale
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
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
