package edu.smartattend.student.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = BrandTealLight,
    onPrimary = Color.Black,
    primaryContainer = BrandTealContainerDark,
    onPrimaryContainer = BrandTealContainerLight,
    secondary = BrandIndigoLight,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFF1E1B4B),
    onSecondaryContainer = Color(0xFFE0E7FF),
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
    primary = BrandTeal,
    onPrimary = Color.White,
    primaryContainer = BrandTealContainerLight,
    onPrimaryContainer = BrandTealDark,
    secondary = BrandIndigo,
    onSecondary = Color.White,
    secondaryContainer = BrandIndigoContainer,
    onSecondaryContainer = Color(0xFF312E81),
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
fun SmartAttendTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
