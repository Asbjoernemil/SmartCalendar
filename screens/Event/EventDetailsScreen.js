import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { formatTime } from '../../utils/dateUtils';
import { Picker } from '@react-native-picker/picker';

export default function EventDetailsScreen({ route, navigation }) {
    const { eventId } = route.params;
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date()); // Hvis du også vil ændre datoen senere.
    const [hour, setHour] = useState(12);
    const [minute, setMinute] = useState(0);
    const [isEditing, setIsEditing] = useState(false);

    // Timer og minutter ligesom i AddEventScreen
    const hours = [...Array(24).keys()]; // 0-23
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    useEffect(() => {
        const fetchEvent = async () => {
            const docRef = doc(db, 'events', eventId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const eventData = docSnap.data();
                setTitle(eventData.title || '');
                setDescription(eventData.description || '');

                if (eventData.time) {
                    const eventTime = new Date(eventData.time);
                    if (!isNaN(eventTime)) {
                        setDate(eventTime);
                        // Sæt hour og minute fra eventTime
                        const h = eventTime.getHours();
                        const m = eventTime.getMinutes();

                        // Find nærmeste 5-minutters interval for at matche Pickerens logik
                        const closestFive = minutes.reduce((prev, curr) =>
                            Math.abs(curr - m) < Math.abs(prev - m) ? curr : prev
                        );

                        setHour(h);
                        setMinute(closestFive);
                    }
                }
            } else {
                Alert.alert('Fejl', 'Aftalen blev ikke fundet.');
                navigation.goBack();
            }
        };

        fetchEvent();
    }, [eventId]);

    const handleUpdateEvent = async () => {
        try {
            const dateString = date.toISOString().split('T')[0];
            const updatedDateTime = new Date(dateString);
            updatedDateTime.setHours(hour, minute, 0, 0);
            const timeString = updatedDateTime.toISOString();

            const docRef = doc(db, 'events', eventId);
            await updateDoc(docRef, {
                title,
                description,
                time: timeString,
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

    // Opret displayedTime baseret på current hour og minute
    const displayedTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);

    return (
        <View style={styles.container}>
            {isEditing ? (
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
                    <Text style={{ marginRight: 10 }}>
                        Vælg tidspunkt: {formatTime(displayedTime)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                </>
            ) : (
                <>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.description}>{description}</Text>
                    <Text style={styles.time}>
                        Tid: {formatTime(displayedTime)}
                    </Text>
                </>
            )}

            <View style={styles.buttonContainer}>
                {isEditing ? (
                    <Button mode="contained" onPress={handleUpdateEvent} style={styles.button}>
                        Gem
                    </Button>
                ) : (
                    <Button
                        mode="contained"
                        onPress={() => setIsEditing(true)}
                        style={styles.button}
                    >
                        Rediger
                    </Button>
                )}
                <Button mode="contained" onPress={handleDeleteEvent} style={styles.button}>
                    Slet
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
        marginBottom: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        marginTop: 20,
    },
    button: {
        marginRight: 10,
    },
});
