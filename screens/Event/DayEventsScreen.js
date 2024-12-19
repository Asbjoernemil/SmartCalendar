// screens/Event/DayEventsScreen.js

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { FAB } from 'react-native-paper';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { useIsFocused } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';

export default function DayEventsScreen({ route, navigation }) {
    const { selectedDate, groupId } = route.params;
    const [events, setEvents] = useState([]);
    const isFocused = useIsFocused();

    useEffect(() => {
        const fetchEvents = async () => {
            // Hvis vi ikke har groupId, kan vi ikke hente events
            if (!groupId) {
                setEvents([]);
                return;
            }

            const q = query(
                collection(db, 'events'),
                where('date', '==', selectedDate),
                where('groupId', '==', groupId)
            );

            const querySnapshot = await getDocs(q);
            const eventsData = [];
            querySnapshot.forEach((doc) => {
                eventsData.push({ id: doc.id, ...doc.data() });
            });
            setEvents(eventsData);
        };

        // Hent events når skærmen får fokus og vi har en gyldig groupId
        if (isFocused && groupId) {
            fetchEvents();
        }
    }, [selectedDate, isFocused, groupId]);

    const renderItem = ({ item }) => {
        const eventTime = item.time ? new Date(item.time) : null;
        const timeString = eventTime ? formatTime(eventTime) : '';

        return (
            <TouchableOpacity
                onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
            >
                <View style={{ padding: 10, backgroundColor: 'white', marginVertical: 5 }}>
                    <Text>{item.title || item.name}</Text>
                    {timeString ? <Text>{timeString}</Text> : null}
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
            <FAB
                style={{ position: 'absolute', margin: 16, right: 0, bottom: 0 }}
                icon="plus"
                onPress={() => navigation.navigate('AddEvent', { selectedDate, groupId })}
            />
        </View>
    );
}
