import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { Picker } from '@react-native-picker/picker';

export default function AddEventScreen({ navigation, route }) {
    const { selectedDate, groupId } = route.params || {};
    const initialDate = selectedDate ? new Date(selectedDate) : new Date();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(initialDate);

    const [hour, setHour] = useState(12);
    const [minute, setMinute] = useState(0);

    const hours = [...Array(24).keys()];
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    useEffect(() => {
        if (!groupId) {
            // Udfør sideeffekten (alert og navigation) i useEffect
            Alert.alert(
                "Ingen gruppe valgt",
                "Der er ingen gruppe valgt. Vælg en gruppe først.",
                [
                    { text: "OK", onPress: () => navigation.goBack() }
                ]
            );
        }
    }, [groupId]);

    // Hvis groupId stadig ikke er defineret, returner en tom view eller en fallback.
    if (!groupId) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Indlæser...</Text>
            </View>
        );
    }

    const handleAddEvent = async () => {
        const dateString = date.toISOString().split('T')[0];
        const selectedDateTime = new Date(dateString);
        selectedDateTime.setHours(hour, minute, 0, 0);
        const timeString = selectedDateTime.toISOString();

        const user = auth.currentUser;

        try {
            await addDoc(collection(db, 'events'), {
                title,
                description,
                date: dateString,
                time: timeString,
                userId: user.uid,
                groupId: groupId
            });
            navigation.goBack();
        } catch (error) {
            console.log('Fejl ved tilføjelse af aftale:', error);
            Alert.alert('Fejl', 'Kunne ikke tilføje aftale. Prøv igen.');
        }
    };

    const displayedTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);

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

            <Button onPress={() => { /* Date picker kan implementeres her */ }} style={styles.dateButton}>
                Vælg dato: {formatDate(date.toISOString().split('T')[0])}
            </Button>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ marginRight: 10 }}>Vælg tid: {formatTime(displayedTime)}</Text>
                <Picker
                    selectedValue={hour}
                    style={{ height: 50, width: 80 }}
                    onValueChange={(itemValue) => setHour(itemValue)}
                >
                    {hours.map((h) => (
                        <Picker.Item key={h} label={h.toString()} value={h} />
                    ))}
                </Picker>

                <Text style={{ marginHorizontal: 5 }}>:</Text>

                <Picker
                    selectedValue={minute}
                    style={{ height: 50, width: 80 }}
                    onValueChange={(itemValue) => setMinute(itemValue)}
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
