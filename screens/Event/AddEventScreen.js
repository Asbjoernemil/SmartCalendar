import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, TextInput, Button, Checkbox } from 'react-native-paper';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { Picker } from '@react-native-picker/picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

// AddEventScreen: til oprettelse af aftale (event).
export default function AddEventScreen({ navigation, route }) {

    // Modtager selectedDate fra navigation (fra DayEventsScreen).
    // Hvis ikke en dato, bruges dd.
    const { selectedDate } = route.params || {};
    const initialDate = selectedDate ? new Date(selectedDate) : new Date();

    // Defineres lokale states for formular(inputfelter)
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(initialDate);

    // State til at styre --> dato-picker være synlig (modal).
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    // Start-/sluttid: Defineres som separate states (timetal og minut-tal).
    // Samles i handleAddEvent, når eventet er oprettet.
    const [startHour, setStartHour] = useState(12);
    const [startMinute, setStartMinute] = useState(0);
    const [endHour, setEndHour] = useState(13);
    const [endMinute, setEndMinute] = useState(0);

    // UserGroups: Liste over grupper, User er medlem af (navn + id).
    // selectedGroups: Grupper der skal tilføjes til nye aftaler.
    const [userGroupsWithNames, setUserGroupsWithNames] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);

    // recurrence: (NONE, DAILY mm.), og en evt. slutdato
    // for gentagelsen. Vis/skjul slutdato-picker i en modal.
    const [recurrenceFrequency, setRecurrenceFrequency] = useState('NONE');
    const [recurrenceEndDate, setRecurrenceEndDate] = useState(null);
    const [showRecurrenceEndPicker, setShowRecurrenceEndPicker] = useState(false);

    // Til <Picker> komponenten, viser timer (0-23) og minutter (5 min).
    const hours = [...Array(24).keys()];
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    /*
     * useEffect: Henter Userens grupper fra Firestore efter første render.
     * Hvis ingen bruger er logget ind, redirect til Login.
     */
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert('Ikke logget ind', 'Du skal være logget ind for at oprette event.');
            navigation.navigate('Login');
            return;
        }

        (async () => {
            try {
                // Hent Userens doc fra 'users' collection.
                const userDocRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userDocRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    // userData.groups array med group-ids,['groupId1','groupId2']
                    const gIds = userData.groups || [];

                    // newArray liste over { id, name } for hver gruppe
                    const newArray = [];
                    for (const gId of gIds) {
                        // For hver gruppe-id, hent group doc.
                        const gRef = doc(db, 'groups', gId);
                        const gSnap = await getDoc(gRef);

                        if (gSnap.exists()) {
                            const gData = gSnap.data();
                            newArray.push({
                                id: gId,
                                // Hvis gruppen har et name-felt ellers brug groupId
                                name: gData.name || gId,
                            });
                        } else {
                            // Hvis doc ikke findes, fallback til groupId som navn
                            newArray.push({ id: gId, name: gId });
                        }
                    }
                    setUserGroupsWithNames(newArray);
                } else {
                    Alert.alert('Ingen brugerdata', 'Der blev ikke fundet data for denne bruger.');
                }
            } catch (err) {
                console.log('Fejl ved hentning af brugerens grupper:', err);
            }
        })();
    }, []);

    /**
     * handleAddEvent: Når User trykker på "Tilføj aftale",
     * 1) Tjekkes inputfelter (titel, gruppevalg),
     * 2) Samles start- og sluttid ud fra states (12:00 - 13:00),
     * 3) Laves nyt event-dokument i Firestore -> 'events' collection.
     */
    const handleAddEvent = async () => {
        // Tjek, om titel er udfyldt
        if (!title.trim()) {
            Alert.alert('Fejl', 'Du mangler at angive en titel.');
            return;
        }

        // Tjek, om mindst én gruppe er valgt
        if (selectedGroups.length === 0) {
            Alert.alert('Ingen grupper valgt', 'Vælg mindst én gruppe, der skal have eventet.');
            return;
        }

        // Konverter "date" til en string i formatet "YYYY-MM-DD"
        const dateString = date.toISOString().split('T')[0];

        // startDateTime = JavaScript Date, sat til kl. startHour:startMinute
        const startDateTime = new Date(dateString);
        startDateTime.setHours(startHour, startMinute, 0, 0);
        const startTimeString = startDateTime.toISOString();

        // endDateTime samme måde
        const endDateTime = new Date(dateString);
        endDateTime.setHours(endHour, endMinute, 0, 0);
        const endTimeString = endDateTime.toISOString();

        // Tjek, sluttid er efter starttid
        if (endDateTime <= startDateTime) {
            Alert.alert('Ugyldig tid', 'Sluttiden skal være efter starttiden.');
            return;
        }

        // User logget ind?
        const user = auth.currentUser;
        if (!user) {
            Alert.alert('Ikke logget ind', 'Du skal være logget ind.');
            return;
        }

        try {
            // Hent farve til User --> eventet kan vises i User-farve
            const userDocRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userDocRef);
            const userData = userSnap.exists() ? userSnap.data() : {};
            const userColor = userData.color || '#000000';

            // Forbered recurrence-objekt (If freq != 'NONE', gem endDate).
            const recurrenceObj = {
                frequency: recurrenceFrequency, // "NONE","DAILY","WEEKLY","MONTHLY","YEARLY"
                endDate: recurrenceEndDate ? recurrenceEndDate.toISOString().split('T')[0] : null,
            };

            // Opret nyt document i 'events'-collection
            // Document indeholder title, date, user color, mm.
            await addDoc(collection(db, 'events'), {
                title,
                description,
                date: dateString,
                startTime: startTimeString,
                endTime: endTimeString,
                userId: user.uid,
                userColor: userColor,
                groupIds: selectedGroups,
                recurrence: {
                    frequency: recurrenceFrequency,
                    endDate: recurrenceEndDate
                        ? recurrenceEndDate.toISOString().split('T')[0]
                        : null
                },
            });

            Alert.alert('Event oprettet!', 'Din event blev oprettet i de valgte grupper.');
            // navigationen
            navigation.goBack();
        } catch (error) {
            console.log('Fejl ved tilføjelse af aftale:', error);
            Alert.alert('Fejl', 'Kunne ikke tilføje aftale. Prøv igen.');
        }
    };

    // Vis dato-picker (modal)
    const showDatePicker = () => setDatePickerVisibility(true);
    const hideDatePicker = () => setDatePickerVisibility(false);

    // Callback: User vælger en dato i date-picker
    const handleDateConfirm = (pickedDate) => {
        hideDatePicker();
        if (pickedDate) {
            setDate(pickedDate);
        }
    };

    // Viser og håndterer slutdato-picker for gentagelse (Reccurence)
    const handleRecurrenceEndConfirm = (pickedDate) => {
        setShowRecurrenceEndPicker(false);
        if (pickedDate) {
            setRecurrenceEndDate(pickedDate);
        }
    };

    // Lavers "displayedStartTime" og "displayedEndTime" for
    // at vise/formatere tiden i UI (formatTime).
    const displayedStartTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, startMinute);
    const displayedEndTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endHour, endMinute);

    // Mulige (recurrenceFrequency)
    const recurrenceOptions = [
        { label: 'Ingen gentagelse', value: 'NONE' },
        { label: 'Daglig', value: 'DAILY' },
        { label: 'Ugentlig', value: 'WEEKLY' },
        { label: 'Månedlig', value: 'MONTHLY' },
        { label: 'Årlig', value: 'YEARLY' },
    ];

    return (
        <ScrollView style={styles.container}>
            {/* Overskrift */}
            <Text variant="headlineMedium" style={styles.header}>
                Ny Aftale
            </Text>

            {/* Titel og beskrivelse */}
            <TextInput
                label="Titel (påkrævet)"
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

            {/* Dato-knap -> åbner DateTimePickerModal */}
            <Button onPress={showDatePicker} mode="outlined" style={styles.dateButton}>
                Vælg dato: {formatDate(date.toISOString().split('T')[0])}
            </Button>
            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                date={date}
                onConfirm={handleDateConfirm}
                onCancel={hideDatePicker}
            />

            {/* Start- og sluttid (Picker til timer og minutter) */}
            <View style={styles.timeContainer}>
                <Text style={styles.timeLabel}>
                    Starttid: {formatTime(displayedStartTime)}
                </Text>
                <View style={styles.timeRow}>
                    {/* Picker til startHour */}
                    <Picker
                        selectedValue={startHour}
                        style={styles.picker}
                        onValueChange={(itemValue) => setStartHour(itemValue)}
                    >
                        {hours.map((h) => (
                            <Picker.Item key={h} label={h.toString()} value={h} />
                        ))}
                    </Picker>
                    <Text>:</Text>
                    {/* Picker til startMinute */}
                    <Picker
                        selectedValue={startMinute}
                        style={styles.picker}
                        onValueChange={(itemValue) => setStartMinute(itemValue)}
                    >
                        {minutes.map((m) => (
                            <Picker.Item key={m} label={m.toString()} value={m} />
                        ))}
                    </Picker>
                </View>
            </View>

            <View style={styles.timeContainer}>
                <Text style={styles.timeLabel}>
                    Sluttid: {formatTime(displayedEndTime)}
                </Text>
                <View style={styles.timeRow}>
                    {/* Picker til endHour */}
                    <Picker
                        selectedValue={endHour}
                        style={styles.picker}
                        onValueChange={(itemValue) => setEndHour(itemValue)}
                    >
                        {hours.map((h) => (
                            <Picker.Item key={h} label={h.toString()} value={h} />
                        ))}
                    </Picker>
                    <Text>:</Text>
                    {/* Picker til endMinute */}
                    <Picker
                        selectedValue={endMinute}
                        style={styles.picker}
                        onValueChange={(itemValue) => setEndMinute(itemValue)}
                    >
                        {minutes.map((m) => (
                            <Picker.Item key={m} label={m.toString()} value={m} />
                        ))}
                    </Picker>
                </View>
            </View>

            {/* Gentagelse(recurrence) */}
            <View style={styles.card}>
                <Text variant="titleMedium" style={{ marginBottom: 10 }}>
                    Gentag aftale?
                </Text>

                {/* Vælg freq: NONE, DAILY, WEEKLY, MONTHLY, YEARLY */}
                <Picker
                    selectedValue={recurrenceFrequency}
                    style={styles.picker}
                    onValueChange={(val) => setRecurrenceFrequency(val)}
                >
                    {recurrenceOptions.map((opt) => (
                        <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                    ))}
                </Picker>

                {recurrenceFrequency !== 'NONE' && (
                    <View style={{ marginTop: 10 }}>
                        <Button mode="outlined" onPress={() => setShowRecurrenceEndPicker(true)}>
                            {recurrenceEndDate
                                ? `Slutdato: ${formatDate(recurrenceEndDate.toISOString().split('T')[0])}`
                                : 'Vælg slutdato for gentagelse'}
                        </Button>
                        <DateTimePickerModal
                            isVisible={showRecurrenceEndPicker}
                            mode="date"
                            date={recurrenceEndDate || new Date()}
                            onConfirm={handleRecurrenceEndConfirm}
                            onCancel={() => setShowRecurrenceEndPicker(false)}
                        />
                    </View>
                )}
            </View>

            {/* Grupper: Liste over, hvilke grupper man vil tilknytte eventet */}
            <Text variant="titleMedium" style={{ marginVertical: 10 }}>
                Vælg grupper:
            </Text>
            {userGroupsWithNames.length === 0 && (
                <Text>Du er ikke medlem af nogen grupper endnu.</Text>
            )}
            {userGroupsWithNames.map((groupObj) => {
                // Tjek om gruppen allerede er valgt
                const checked = selectedGroups.includes(groupObj.id);
                return (
                    <Checkbox.Item
                        key={groupObj.id}
                        label={groupObj.name}
                        status={checked ? 'checked' : 'unchecked'}
                        onPress={() => {
                            if (checked) {
                                // Fjern fra selectedGroups
                                setSelectedGroups(selectedGroups.filter((gid) => gid !== groupObj.id));
                            } else {
                                // Tilføj til selectedGroups
                                setSelectedGroups([...selectedGroups, groupObj.id]);
                            }
                        }}
                    />
                );
            })}

            {/* Knap til at oprette eventet i Firestore */}
            <Button mode="contained" onPress={handleAddEvent} style={styles.button}>
                Tilføj aftale
            </Button>
        </ScrollView>
    );
}

// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f8f8f8',
    },
    header: {
        marginBottom: 10,
    },
    textInput: {
        marginBottom: 10,
    },
    dateButton: {
        marginBottom: 10,
        alignSelf: 'flex-start',
    },
    timeContainer: {
        marginBottom: 10,
    },
    timeLabel: {
        marginBottom: 5,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    picker: {
        width: 80,
        height: 50,
        marginHorizontal: 5,
    },
    card: {
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 6,
        marginBottom: 20,
    },
    button: {
        marginVertical: 10,
    },
});
