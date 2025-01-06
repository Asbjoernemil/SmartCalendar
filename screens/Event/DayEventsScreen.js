import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { FAB } from 'react-native-paper';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { useIsFocused } from '@react-navigation/native';
import { doesEventOccurOnDate } from '../../utils/recurrenceUtils';

export default function DayEventsScreen({ route, navigation }) {
    const { selectedDate, groupId } = route.params;
    const [events, setEvents] = useState([]);
    const isFocused = useIsFocused();

    useEffect(() => {
        const fetchEvents = async () => {
            if (!groupId) {
                setEvents([]);
                return;
            }

            // 1) Hent ALLE events for groupId
            const ref = collection(db, 'events');
            const q = query(ref, where('groupIds', 'array-contains', groupId));
            const snapshot = await getDocs(q);

            // 2) Byg en liste over events der forekommer på selectedDate
            const newArr = [];
            snapshot.forEach((docSnap) => {
                const evt = docSnap.data();
                if (doesEventOccurOnDate(evt, selectedDate)) {
                    newArr.push({
                        id: docSnap.id,
                        ...evt,
                        userColor: evt.userColor || '#000',
                    });
                }
            });

            // 3) **Sorter** newArr efter startTime (tidligst først)
            newArr.sort((a, b) => {
                const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
                const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
                return aTime - bTime;
            });

            setEvents(newArr);
        };

        // Henter events når skærmen er i fokus
        if (isFocused && groupId) {
            fetchEvents();
        }
    }, [selectedDate, isFocused, groupId]);

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

            <FlatList
                data={events}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={<Text>Ingen aftaler denne dag.</Text>}
            />

            {/* Bunden: DayView-knap + FAB */}
            <View style={styles.bottomContainer}>
                <TouchableOpacity
                    style={styles.dayViewButton}
                    onPress={() => navigation.navigate('DayView', { selectedDate, groupId })}
                >
                    <Text style={{ color: 'white' }}>Vis Day View</Text>
                </TouchableOpacity>

                <FAB
                    style={styles.fab}
                    icon="plus"
                    onPress={() => navigation.navigate('AddEvent', { selectedDate, groupId })}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    eventContainer: {
        padding: 10,
        backgroundColor: 'white',
        marginVertical: 5,
        borderRadius: 5,
        borderLeftWidth: 5,
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
