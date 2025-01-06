import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { FAB } from 'react-native-paper';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { useIsFocused } from '@react-navigation/native';
import { doesEventOccurOnDate } from '../../utils/recurrenceUtils';

/**
 * DayEventsScreen:
 *  - Viser alle events, på bestemt dato (selectedDate)
 *    for en bestemt gruppe (groupId).
 *  - Henter events fra Firestore, filtrerer dem vha. doesEventOccurOnDate,
 *    sorterer kronologisk, og viser dem i en liste.
 *  - mulighed for at navigere til EventDetails eller oprette ny event.
 */
export default function DayEventsScreen({ route, navigation }) {
    // Modtager selectedDate og groupId som params fra navigation (HomeScreen eller Agenda).
    const { selectedDate, groupId } = route.params;

    // Local state til de events, der skal vises.
    const [events, setEvents] = useState([]);

    const isFocused = useIsFocused();

    // useEffect: Henter data fra Firestore, hver gang screen i fokus ELLER
    // groupId / selectedDate ændrer sig.
    useEffect(() => {
        const fetchEvents = async () => {
            // Hvis der ikke er valgt en gruppe, kan ikke hente events.
            if (!groupId) {
                setEvents([]);
                return;
            }

            // Hent ALLE dokumenter fra 'events' collection, hvor 'groupIds' array-contains groupId.
            const ref = collection(db, 'events');
            const q = query(ref, where('groupIds', 'array-contains', groupId));
            const snapshot = await getDocs(q);

            // For hvert event i snapshot => tjek om det forekommer på selectedDate
            const newArr = [];
            snapshot.forEach((docSnap) => {
                const evt = docSnap.data();
                if (doesEventOccurOnDate(evt, selectedDate)) {
                    // Tilføj event, tilpas userColor etc.
                    newArr.push({
                        id: docSnap.id,
                        ...evt, // title, startTime, endTime, userId,
                        userColor: evt.userColor || '#000',
                    });
                }
            });

            // Sort listen startTime
            newArr.sort((a, b) => {
                const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
                const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
                return aTime - bTime;
            });

            setEvents(newArr);
        };

        // Kald fetchEvents når skærmen bliver fokuseret + har gyldig groupId
        if (isFocused && groupId) {
            fetchEvents();
        }
    }, [selectedDate, isFocused, groupId]);

    // renderItem: Viser hvert event i en TouchableOpacity, som navigerer til EventDetails
    const renderItem = ({ item }) => {
        const start = item.startTime ? new Date(item.startTime) : null;
        const end = item.endTime ? new Date(item.endTime) : null;
        const startString = start ? formatTime(start) : '';
        const endString = end ? formatTime(end) : '';

        return (
            <TouchableOpacity
                onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
            >
                <View style={[styles.eventContainer, { borderLeftColor: item.userColor }]}>
                    <Text>{item.title || item.name}</Text>
                    {/* Hvis der er en start- og sluttid, vises "HH:MM - HH:MM" */}
                    {startString && endString && (
                        <Text>
                            {startString} - {endString}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, padding: 10 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
                Aftaler for {formatDate(selectedDate)}
            </Text>

            {/* Liste over day events */}
            <FlatList
                data={events}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                // Tekst, hvis ingen aftaler
                ListEmptyComponent={<Text>Ingen aftaler denne dag.</Text>}
            />

            {/* Nederst på skærmen: "Vis Day View" knap + FAB til at oprette ny aftale */}
            <View style={styles.bottomContainer}>
                {/* Knap navigere til DayViewScreen (i big-calendar) */}
                <TouchableOpacity
                    style={styles.dayViewButton}
                    onPress={() => navigation.navigate('DayView', { selectedDate, groupId })}
                >
                    <Text style={{ color: 'white' }}>Vis Day View</Text>
                </TouchableOpacity>

                {/* FAB (Floating Action Button) navigere til AddEventScreen */}
                <FAB
                    style={styles.fab}
                    icon="plus"
                    onPress={() => navigation.navigate('AddEvent', { selectedDate, groupId })}
                />
            </View>
        </View>
    );
}

// styles
const styles = StyleSheet.create({
    eventContainer: {
        padding: 10,
        backgroundColor: 'white',
        marginVertical: 5,
        borderRadius: 5,
        borderLeftWidth: 5, // Indikatorfarve i venstre side
    },
    bottomContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    dayViewButton: {
        backgroundColor: '#6200ee',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 5,
        marginLeft: 16,
        marginBottom: 16,
    },
    fab: {
        margin: 16,
    },
});