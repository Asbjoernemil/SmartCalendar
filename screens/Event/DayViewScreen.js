import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Calendar } from 'react-native-big-calendar';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useIsFocused } from '@react-navigation/native';
import { doesEventOccurOnDate } from '../../utils/recurrenceUtils';

export default function DayViewScreen({ route }) {
    const { selectedDate, groupId } = route.params;
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const isFocused = useIsFocused();

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            if (!groupId) {
                setEvents([]);
                setLoading(false);
                return;
            }

            try {
                // 1) Hent ALLE events for groupId (uden at begrænse på date)
                const q = query(
                    collection(db, 'events'),
                    where('groupIds', 'array-contains', groupId)
                );
                const querySnapshot = await getDocs(q);

                const dayEvents = [];

                // 2) For hvert event => brug doesEventOccurOnDate for at se om det forekommer på selectedDate
                querySnapshot.forEach((docSnap) => {
                    const eventData = docSnap.data();

                    // doesEventOccurOnDate(eventData, selectedDate) returnerer true/false
                    if (doesEventOccurOnDate(eventData, selectedDate)) {
                        // Tjek at startTime og endTime findes, og parse dem til Date
                        if (eventData.startTime && eventData.endTime) {
                            const start = new Date(eventData.startTime);
                            const end = new Date(eventData.endTime);
                            dayEvents.push({
                                // Felter som Calendar fra 'react-native-big-calendar' forventer
                                title: eventData.title || 'Uden titel',
                                start: start,
                                end: end,
                                color: eventData.userColor || '#000',
                            });
                        }
                    }
                });

                setEvents(dayEvents);
            } catch (error) {
                console.log('Fejl ved hentning af events:', error);
            }

            setLoading(false);
        };

        if (isFocused) {
            fetchEvents();
        }
    }, [selectedDate, isFocused, groupId]);

    if (loading) {
        return <ActivityIndicator style={{ flex: 1 }} />;
    }

    const eventCellStyle = (event) => ({
        backgroundColor: event.color || '#000',
        borderRadius: 5,
        padding: 5,
    });

    return (
        <View style={{ flex: 1 }}>
            <Calendar
                events={events}
                height={600}
                mode="day"
                // Fortæller kalenderen hvilken dag, der skal vises
                date={new Date(selectedDate)}
                eventCellStyle={eventCellStyle}
                overlapOffset={100}
            />
        </View>
    );
}
