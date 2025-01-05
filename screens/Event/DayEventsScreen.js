import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { FAB } from 'react-native-paper';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { useIsFocused } from '@react-navigation/native';

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
            const q = query(
                collection(db, 'events'),
                where('date', '==', selectedDate),
                where('groupIds', 'array-contains', groupId)
            );
            const querySnapshot = await getDocs(q);
            const eventsData = [];
            querySnapshot.forEach((docSnap) => {
                const event = docSnap.data();
                eventsData.push({
                    id: docSnap.id,
                    ...event,
                    userColor: event.userColor || '#000',
                });
            });
            setEvents(eventsData);
        };

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
                        <Text>{startString} - {endString}</Text>
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

            {/* Bunden: en container til DayView-knap + FAB */}
            <View style={styles.bottomContainer}>
                {/* Venstre: DayView-knap */}
                <TouchableOpacity
                    style={styles.dayViewButton}
                    onPress={() => navigation.navigate('DayView', { selectedDate, groupId })}
                >
                    <Text style={{ color: 'white' }}>Vis Day View</Text>
                </TouchableOpacity>

                {/* Højre: FAB plus-knap */}
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
        // Placerer DayView-knap til venstre, FAB til højre.
        // Evt. giv en fast højde, baggrundsfarve, etc.
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
        marginBottom: 16, // giv lidt bundmargin, så den ikke rører helt i bunden
    },
    fab: {
        margin: 16,
    },
});
