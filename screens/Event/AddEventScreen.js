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

    // Start- og sluttid
    const [startHour, setStartHour] = useState(12);
    const [startMinute, setStartMinute] = useState(0);
    const [endHour, setEndHour] = useState(13);
    const [endMinute, setEndMinute] = useState(0);

    // Her holder vi styr på grupper
    // A) Oprindeligt userGroups = [gId, gId2,...]
    // B) Ny state: userGroupsWithNames = [{id, name}, {id, name}...]
    const [userGroupsWithNames, setUserGroupsWithNames] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);

    const hours = [...Array(24).keys()];
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert('Ikke logget ind', 'Du skal være logget ind for at oprette event.');
            navigation.navigate('Login');
            return;
        }

        // 1) Hent userData -> userData.groups => fx ["grp1", "grp2"]
        (async () => {
            try {
                const userDocRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userDocRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    const gIds = userData.groups || [];

                    // 2) For hver gId -> hent groupDoc -> push {id, name}
                    const newArray = [];
                    for (const gId of gIds) {
                        const gRef = doc(db, 'groups', gId);
                        const gSnap = await getDoc(gRef);
                        if (gSnap.exists()) {
                            const gData = gSnap.data();
                            newArray.push({
                                id: gId,
                                name: gData.name || gId, // fallback
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
            // Hent userColor
            const userDocRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userDocRef);
            const userData = userSnap.exists() ? userSnap.data() : {};
            const userColor = userData.color || '#000000';

            await addDoc(collection(db, 'events'), {
                title,
                description,
                date: dateString,
                startTime: startTimeString,
                endTime: endTimeString,
                userId: user.uid,
                userColor: userColor,
                // Her gemmes selve IDs, selvom vi viste navne til brugeren
                groupIds: selectedGroups,
            });

            Alert.alert('Event oprettet!', 'Din event blev oprettet i de valgte grupper.');
            navigation.goBack();
        } catch (error) {
            console.log('Fejl ved tilføjelse af aftale:', error);
            Alert.alert('Fejl', 'Kunne ikke tilføje aftale. Prøv igen.');
        }
    };

    // DatePicker-funktioner
    const showDatePicker = () => setDatePickerVisibility(true);
    const hideDatePicker = () => setDatePickerVisibility(false);
    const handleDateConfirm = (pickedDate) => {
        hideDatePicker();
        if (pickedDate) setDate(pickedDate);
    };

    const displayedStartTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, startMinute);
    const displayedEndTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endHour, endMinute);

    return (
        <ScrollView style={styles.container}>
            <Text variant="headlineMedium" style={{ marginBottom: 10 }}>Ny Aftale</Text>

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

            <Button onPress={showDatePicker} style={styles.dateButton}>
                Vælg dato: {formatDate(date.toISOString().split('T')[0])}
            </Button>
            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                date={date}
                onConfirm={handleDateConfirm}
                onCancel={hideDatePicker}
            />

            <Text style={{ marginBottom: 5 }}>Starttid: {formatTime(displayedStartTime)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <Picker
                    selectedValue={startHour}
                    style={{ height: 50, width: 80 }}
                    onValueChange={(itemValue) => setStartHour(itemValue)}
                >
                    {hours.map((h) => <Picker.Item key={h} label={h.toString()} value={h} />)}
                </Picker>
                <Text style={{ marginHorizontal: 5 }}>:</Text>
                <Picker
                    selectedValue={startMinute}
                    style={{ height: 50, width: 80 }}
                    onValueChange={(itemValue) => setStartMinute(itemValue)}
                >
                    {minutes.map((m) => <Picker.Item key={m} label={m.toString()} value={m} />)}
                </Picker>
            </View>

            <Text style={{ marginBottom: 5 }}>Sluttid: {formatTime(displayedEndTime)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <Picker
                    selectedValue={endHour}
                    style={{ height: 50, width: 80 }}
                    onValueChange={(itemValue) => setEndHour(itemValue)}
                >
                    {hours.map((h) => <Picker.Item key={h} label={h.toString()} value={h} />)}
                </Picker>
                <Text style={{ marginHorizontal: 5 }}>:</Text>
                <Picker
                    selectedValue={endMinute}
                    style={{ height: 50, width: 80 }}
                    onValueChange={(itemValue) => setEndMinute(itemValue)}
                >
                    {minutes.map((m) => <Picker.Item key={m} label={m.toString()} value={m} />)}
                </Picker>
            </View>

            {/* Vælg grupper */}
            <Text variant="titleMedium" style={{ marginVertical: 10 }}>Vælg grupper:</Text>
            {userGroupsWithNames.length === 0 && (
                <Text>Du er ikke medlem af nogen grupper endnu.</Text>
            )}
            {userGroupsWithNames.map((groupObj) => {
                const checked = selectedGroups.includes(groupObj.id);
                return (
                    <Checkbox.Item
                        key={groupObj.id}
                        // Viser gruppens NAVN i stedet for ID
                        label={groupObj.name}
                        status={checked ? 'checked' : 'unchecked'}
                        onPress={() => {
                            if (checked) {
                                setSelectedGroups(selectedGroups.filter(gid => gid !== groupObj.id));
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
    container: { flex: 1, padding: 20 },
    textInput: { marginBottom: 10 },
    dateButton: { marginBottom: 10, alignSelf: 'flex-start' },
    button: { marginVertical: 10 },
});
