/**
 * Property Form Screen
 * Add or edit a rental property
 * Includes Booking.com import with full data extraction
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LargeTextButton } from '@/src/components/accessible';
import { borderRadius, colors, spacing, touchTarget } from '@/src/core/theme';
import { isValidBookingUrl, scrapeBookingProperty } from '@/src/features/properties/bookingScraper';
import {
    createProperty,
    getProperty,
    updateProperty,
} from '@/src/features/properties/propertyService';

export default function PropertyFormScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string }>();
    const isEditing = !!params.id;

    // Booking import state
    const [bookingUrl, setBookingUrl] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    // Form state - Basic info
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('España');
    const [description, setDescription] = useState('');

    // Form state - Details
    const [pricePerNight, setPricePerNight] = useState('');
    const [maxGuests, setMaxGuests] = useState('2');
    const [bedrooms, setBedrooms] = useState('1');
    const [bathrooms, setBathrooms] = useState('1');
    const [isActive, setIsActive] = useState(true);

    // Form state - Amenities (extracted from Booking)
    const [amenities, setAmenities] = useState<string[]>([]);
    const [savedBookingUrl, setSavedBookingUrl] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Load existing property data if editing
    useEffect(() => {
        if (params.id) {
            loadProperty(params.id);
        }
    }, [params.id]);

    const loadProperty = async (id: string) => {
        setIsLoading(true);
        const result = await getProperty(id);

        if (result.success && result.data && !Array.isArray(result.data)) {
            const property = result.data;
            setName(property.name);
            setAddress(property.address || '');
            setCity(property.city || '');
            setCountry(property.country || 'España');
            setDescription(property.description || '');
            setPricePerNight(property.price_per_night?.toString() || '');
            setMaxGuests(property.max_guests?.toString() || '2');
            setBedrooms(property.bedrooms?.toString() || '1');
            setBathrooms(property.bathrooms?.toString() || '1');
            setIsActive(property.is_active);

            // Load amenities if present
            if (property.amenities) {
                if (Array.isArray(property.amenities)) {
                    setAmenities(property.amenities);
                } else if (typeof property.amenities === 'object') {
                    // Convert object to array of keys where value is true
                    setAmenities(Object.keys(property.amenities).filter(k => property.amenities[k]));
                }
            }

            // Load booking URL if present
            if ((property as any).booking_url) {
                setSavedBookingUrl((property as any).booking_url);
                setBookingUrl((property as any).booking_url);
            }
        } else {
            Alert.alert('Error', result.error || 'No se pudo cargar el alojamiento');
            router.back();
        }

        setIsLoading(false);
    };

    // Import from Booking.com
    const handleImportFromBooking = async () => {
        if (!bookingUrl.trim()) {
            Alert.alert('Aviso', 'Pega el enlace de tu alojamiento en Booking.com');
            return;
        }

        if (!isValidBookingUrl(bookingUrl)) {
            Alert.alert(
                'Enlace no válido',
                'El enlace debe ser de Booking.com\n\nEjemplo:\nhttps://www.booking.com/hotel/es/mi-apartamento.html'
            );
            return;
        }

        setIsImporting(true);

        const result = await scrapeBookingProperty(bookingUrl);

        setIsImporting(false);

        if (result.success && result.data) {
            // Fill form with all scraped data
            if (result.data.name) setName(result.data.name);
            if (result.data.address) setAddress(result.data.address);
            if (result.data.city) setCity(result.data.city);
            if (result.data.country) setCountry(result.data.country);
            if (result.data.description) setDescription(result.data.description);
            if (result.data.pricePerNight) setPricePerNight(result.data.pricePerNight.toString());
            if (result.data.maxGuests) setMaxGuests(result.data.maxGuests.toString());
            if (result.data.bedrooms) setBedrooms(result.data.bedrooms.toString());
            if (result.data.bathrooms) setBathrooms(result.data.bathrooms.toString());
            if (result.data.amenities) setAmenities(result.data.amenities);
            if (result.data.bookingUrl) setSavedBookingUrl(result.data.bookingUrl);

            Alert.alert(
                '✅ Datos Extraídos',
                result.message || 'Se han extraído los datos del enlace. Revisa y ajusta si es necesario.'
            );
        } else {
            Alert.alert('Error', result.error || 'No se pudieron importar los datos');
        }
    };

    const handleSave = async () => {
        // Validation
        if (!name.trim()) {
            Alert.alert('Aviso', 'El nombre es obligatorio');
            return;
        }

        setIsSaving(true);

        // Convert amenities array to object for JSONB storage
        const amenitiesObj: Record<string, boolean> = {};
        amenities.forEach(a => { amenitiesObj[a] = true; });

        const propertyData = {
            name: name.trim(),
            address: address.trim() || null,
            city: city.trim() || null,
            country: country.trim(),
            description: description.trim() || null,
            price_per_night: pricePerNight ? parseFloat(pricePerNight) : null,
            max_guests: parseInt(maxGuests) || 2,
            bedrooms: parseInt(bedrooms) || 1,
            bathrooms: parseInt(bathrooms) || 1,
            is_active: isActive,
            amenities: amenitiesObj,
            booking_url: savedBookingUrl || null,
        };

        let result;
        if (isEditing && params.id) {
            result = await updateProperty(params.id, propertyData);
        } else {
            result = await createProperty(propertyData);
        }

        setIsSaving(false);

        if (result.success) {
            Alert.alert(
                '✅ Guardado',
                isEditing ? 'Alojamiento actualizado correctamente' : 'Alojamiento creado correctamente',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } else {
            Alert.alert('Error', result.error || 'No se pudo guardar');
        }
    };

    // Remove an amenity
    const removeAmenity = (index: number) => {
        setAmenities(prev => prev.filter((_, i) => i !== index));
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ title: isEditing ? 'Editar Alojamiento' : 'Nuevo Alojamiento' }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: isEditing ? '✏️ Editar Alojamiento' : '➕ Nuevo Alojamiento' }} />

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">

                    {/* Booking Import Section */}
                    <View style={styles.importSection}>
                        <Text style={styles.importTitle}>🔗 Importar desde Booking</Text>
                        <Text style={styles.importHint}>
                            Pega el enlace de tu alojamiento en Booking.com para rellenar los datos automáticamente
                        </Text>

                        <TextInput
                            style={styles.urlInput}
                            value={bookingUrl}
                            onChangeText={setBookingUrl}
                            placeholder="https://www.booking.com/hotel/es/..."
                            placeholderTextColor={colors.placeholder}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="url"
                        />

                        <TouchableOpacity
                            style={[styles.importButton, isImporting && styles.importingButton]}
                            onPress={handleImportFromBooking}
                            disabled={isImporting}
                        >
                            {isImporting ? (
                                <>
                                    <ActivityIndicator size="small" color="white" />
                                    <Text style={styles.importButtonText}>Importando...</Text>
                                </>
                            ) : (
                                <Text style={styles.importButtonText}>📥 Importar Datos</Text>
                            )}
                        </TouchableOpacity>

                        {savedBookingUrl ? (
                            <Text style={styles.savedUrlText}>✓ Enlace guardado</Text>
                        ) : null}

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>o rellena manualmente</Text>
                            <View style={styles.dividerLine} />
                        </View>
                    </View>

                    {/* Basic Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📝 Información Básica</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nombre del Alojamiento *</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Ej: Apartamento Centro"
                                placeholderTextColor={colors.placeholder}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Descripción</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Describe tu alojamiento..."
                                placeholderTextColor={colors.placeholder}
                                multiline
                                numberOfLines={4}
                            />
                        </View>
                    </View>

                    {/* Location */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📍 Ubicación</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Dirección</Text>
                            <TextInput
                                style={styles.input}
                                value={address}
                                onChangeText={setAddress}
                                placeholder="Calle, número, piso..."
                                placeholderTextColor={colors.placeholder}
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, styles.flex1]}>
                                <Text style={styles.label}>Ciudad</Text>
                                <TextInput
                                    style={styles.input}
                                    value={city}
                                    onChangeText={setCity}
                                    placeholder="Ciudad"
                                    placeholderTextColor={colors.placeholder}
                                />
                            </View>
                            <View style={[styles.inputGroup, styles.flex1]}>
                                <Text style={styles.label}>País</Text>
                                <TextInput
                                    style={styles.input}
                                    value={country}
                                    onChangeText={setCountry}
                                    placeholder="País"
                                    placeholderTextColor={colors.placeholder}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Details */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>🏠 Detalles</Text>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, styles.flex1]}>
                                <Text style={styles.label}>Habitaciones</Text>
                                <TextInput
                                    style={styles.input}
                                    value={bedrooms}
                                    onChangeText={setBedrooms}
                                    keyboardType="numeric"
                                    placeholder="1"
                                    placeholderTextColor={colors.placeholder}
                                />
                            </View>
                            <View style={[styles.inputGroup, styles.flex1]}>
                                <Text style={styles.label}>Baños</Text>
                                <TextInput
                                    style={styles.input}
                                    value={bathrooms}
                                    onChangeText={setBathrooms}
                                    keyboardType="numeric"
                                    placeholder="1"
                                    placeholderTextColor={colors.placeholder}
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, styles.flex1]}>
                                <Text style={styles.label}>Huéspedes Máx.</Text>
                                <TextInput
                                    style={styles.input}
                                    value={maxGuests}
                                    onChangeText={setMaxGuests}
                                    keyboardType="numeric"
                                    placeholder="2"
                                    placeholderTextColor={colors.placeholder}
                                />
                            </View>
                            <View style={[styles.inputGroup, styles.flex1]}>
                                <Text style={styles.label}>Precio/Noche (€)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={pricePerNight}
                                    onChangeText={setPricePerNight}
                                    keyboardType="decimal-pad"
                                    placeholder="80"
                                    placeholderTextColor={colors.placeholder}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Amenities Section */}
                    {amenities.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>✨ Servicios y Comodidades</Text>
                            <View style={styles.amenitiesContainer}>
                                {amenities.map((amenity, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.amenityTag}
                                        onPress={() => removeAmenity(index)}
                                    >
                                        <Text style={styles.amenityText}>{amenity}</Text>
                                        <Text style={styles.amenityRemove}>×</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.amenityHint}>Pulsa para eliminar</Text>
                        </View>
                    )}

                    {/* Status */}
                    <View style={styles.section}>
                        <View style={styles.switchRow}>
                            <View>
                                <Text style={styles.label}>Alojamiento Activo</Text>
                                <Text style={styles.switchHint}>
                                    Los alojamientos inactivos no aparecen en el calendario
                                </Text>
                            </View>
                            <Switch
                                value={isActive}
                                onValueChange={setIsActive}
                                trackColor={{ false: '#ccc', true: colors.success }}
                                thumbColor={isActive ? '#fff' : '#f4f3f4'}
                            />
                        </View>
                    </View>

                    {/* Save Button */}
                    <View style={styles.buttonContainer}>
                        <LargeTextButton
                            title={isSaving ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Alojamiento')}
                            onPress={handleSave}
                            disabled={isSaving}
                        />
                    </View>

                    <View style={styles.spacer} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: spacing.md,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Import section styles
    importSection: {
        backgroundColor: '#E3F2FD',
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    importTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    importHint: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.md,
        lineHeight: 20,
    },
    urlInput: {
        height: touchTarget.minimum,
        borderWidth: 2,
        borderColor: colors.primary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        fontSize: 14,
        color: colors.text,
        backgroundColor: colors.background,
        marginBottom: spacing.md,
    },
    importButton: {
        backgroundColor: colors.primary,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    importingButton: {
        opacity: 0.7,
    },
    importButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    savedUrlText: {
        color: colors.success,
        fontSize: 13,
        marginTop: spacing.sm,
        textAlign: 'center',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.primary,
        opacity: 0.3,
    },
    dividerText: {
        color: colors.primary,
        fontSize: 13,
        marginHorizontal: spacing.md,
    },
    // Form section styles
    section: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.lg,
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    input: {
        height: touchTarget.minimum,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        fontSize: 16,
        color: colors.text,
        backgroundColor: colors.background,
    },
    textArea: {
        height: 100,
        paddingTop: spacing.md,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    flex1: {
        flex: 1,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    switchHint: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    // Amenities styles
    amenitiesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    amenityTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        gap: 4,
    },
    amenityText: {
        fontSize: 13,
        color: '#2E7D32',
    },
    amenityRemove: {
        fontSize: 16,
        color: '#2E7D32',
        fontWeight: 'bold',
    },
    amenityHint: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: spacing.sm,
    },
    buttonContainer: {
        marginTop: spacing.md,
    },
    spacer: {
        height: spacing.xxl,
    },
});
