package edu.smartattend.teacher.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = BrandIndigoLight,
    onPrimary = Color.White,
    primaryContainer = BrandIndigoContainerDark,
    onPrimaryContainer = Color(0xFFE0E7FF),
    secondary = BrandTealLight,
    onSecondary = Color.Black,
    secondaryContainer = Color(0xFF134E4A),
    onSecondaryContainer = BrandTealContainer,
    background = DarkBg,
    onBackground = DarkTextPrimary,
    surface = DarkSurface,
    onSurface = DarkTextPrimary,
    surfaceVariant = DarkSurfaceVariant,
    onSurfaceVariant = DarkTextSecondary,
    outline = DarkBorder,
    error = DangerRose,
    onError = Color.White,
    errorContainer = Color(0xFF7F1D1D),
    onErrorContainer = DangerRoseContainer
)

private val LightColorScheme = lightColorScheme(
    primary = BrandIndigo,
    onPrimary = Color.White,
    primaryContainer = BrandIndigoContainerLight,
    onPrimaryContainer = BrandIndigoDark,
    secondary = BrandTeal,
    onSecondary = Color.White,
    secondaryContainer = BrandTealContainer,
    onSecondaryContainer = Color(0xFF115E59),
    background = LightBg,
    onBackground = LightTextPrimary,
    surface = LightSurface,
    onSurface = LightTextPrimary,
    surfaceVariant = LightSurfaceVariant,
    onSurfaceVariant = LightTextSecondary,
    outline = LightBorder,
    error = DangerRose,
    onError = Color.White,
    errorContainer = DangerRoseContainer,
    onErrorContainer = Color(0xFF991B1B)
)

@Composable
fun SmartAttendTeacherTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
