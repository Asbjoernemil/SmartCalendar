import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, TextInput, Button, Checkbox } from 'react-native-paper';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { Picker } from '@react-native-picker/picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

export default function AddEventScreen({ navigation, route }) {
    const { selectedDate } = route.params || {};
    const initialDate = selectedDate ? new Date(selectedDate) : new Date();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(initialDate);

    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    // Start-/sluttid
    const [startHour, setStartHour] = useState(12);
    const [startMinute, setStartMinute] = useState(0);
    const [endHour, setEndHour] = useState(13);
    const [endMinute, setEndMinute] = useState(0);

    // Grupper
    const [userGroupsWithNames, setUserGroupsWithNames] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);

    // Gentagelse
    const [recurrenceFrequency, setRecurrenceFrequency] = useState('NONE');
    const [recurrenceEndDate, setRecurrenceEndDate] = useState(null);
    const [showRecurrenceEndPicker, setShowRecurrenceEndPicker] = useState(false);

    const hours = [...Array(24).keys()];
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    // Hent brugerens grupper
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
                    const gIds = userData.groups || [];

                    const newArray = [];
                    for (const gId of gIds) {
                        const gRef = doc(db, 'groups', gId);
                        const gSnap = await getDoc(gRef);
                        if (gSnap.exists()) {
                            const gData = gSnap.data();
                            newArray.push({
                                id: gId,
                                name: gData.name || gId,
                            });
                        } else {
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

    // Opret event i Firestore
    const handleAddEvent = async () => {
        if (!title.trim()) {
            Alert.alert('Fejl', 'Du mangler at angive en titel.');
            return;
        }
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
            // Hent userColor
            const userDocRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userDocRef);
            const userData = userSnap.exists() ? userSnap.data() : {};
            const userColor = userData.color || '#000000';

            // Byg recurrence-objekt
            const recurrenceObj = {
                frequency: recurrenceFrequency, // "NONE","DAILY","WEEKLY","MONTHLY","YEARLY"
                endDate: recurrenceEndDate ? recurrenceEndDate.toISOString().split('T')[0] : null,
            };

            await addDoc(collection(db, 'events'), {
                title,
                description,
                date: dateString, // Startdato
                startTime: startTimeString,
                endTime: endTimeString,
                userId: user.uid,
                userColor: userColor,
                groupIds: selectedGroups,
                recurrence: recurrenceObj,
            });

            Alert.alert('Event oprettet!', 'Din event blev oprettet i de valgte grupper.');
            navigation.goBack();
        } catch (error) {
            console.log('Fejl ved tilføjelse af aftale:', error);
            Alert.alert('Fejl', 'Kunne ikke tilføje aftale. Prøv igen.');
        }
    };

    // DatoPicker for “dato”
    const showDatePicker = () => setDatePickerVisibility(true);
    const hideDatePicker = () => setDatePickerVisibility(false);
    const handleDateConfirm = (pickedDate) => {
        hideDatePicker();
        if (pickedDate) {
            setDate(pickedDate);
        }
    };

    // DatoPicker for “recurrenceEndDate”
    const handleRecurrenceEndConfirm = (pickedDate) => {
        setShowRecurrenceEndPicker(false);
        if (pickedDate) {
            setRecurrenceEndDate(pickedDate);
        }
    };

    const displayedStartTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, startMinute);
    const displayedEndTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endHour, endMinute);

    const recurrenceOptions = [
        { label: 'Ingen gentagelse', value: 'NONE' },
        { label: 'Daglig', value: 'DAILY' },
        { label: 'Ugentlig', value: 'WEEKLY' },
        { label: 'Månedlig', value: 'MONTHLY' },
        { label: 'Årlig', value: 'YEARLY' },
    ];

    return (
        <ScrollView style={styles.container}>
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

            {/* Vælg dato */}
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

            {/* Start/Slut tid */}
            <View style={styles.timeContainer}>
                <Text style={styles.timeLabel}>Starttid: {formatTime(displayedStartTime)}</Text>
                <View style={styles.timeRow}>
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
                <Text style={styles.timeLabel}>Sluttid: {formatTime(displayedEndTime)}</Text>
                <View style={styles.timeRow}>
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

            {/* Gentagelse */}
            <View style={styles.card}>
                <Text variant="titleMedium" style={{ marginBottom: 10 }}>
                    Gentag aftale?
                </Text>

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

            {/* Vælg grupper */}
            <Text variant="titleMedium" style={{ marginVertical: 10 }}>
                Vælg grupper:
            </Text>
            {userGroupsWithNames.length === 0 && (
                <Text>Du er ikke medlem af nogen grupper endnu.</Text>
            )}
            {userGroupsWithNames.map((groupObj) => {
                const checked = selectedGroups.includes(groupObj.id);
                return (
                    <Checkbox.Item
                        key={groupObj.id}
                        label={groupObj.name}
                        status={checked ? 'checked' : 'unchecked'}
                        onPress={() => {
                            if (checked) {
                                setSelectedGroups(selectedGroups.filter((gid) => gid !== groupObj.id));
                            } else {
                                setSelectedGroups([...selectedGroups, groupObj.id]);
                            }
                        }}
                    />
                );
            })}

            <Button mode="contained" onPress={handleAddEvent} style={styles.button}>
                Tilføj aftale
            </Button>
        </ScrollView>
    );
}

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
