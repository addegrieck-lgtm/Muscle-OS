plugins {
    java
}

group = "fr.vaeloria"
version = "0.1.0"

java {
    toolchain.languageVersion.set(JavaLanguageVersion.of(21))
}

repositories {
    mavenCentral()
    maven("https://repo.papermc.io/repository/maven-public/")
    maven("https://repo.codemc.io/repository/maven-releases/")
}

dependencies {
    // Fournies par le serveur : non incluses dans le jar.
    compileOnly("io.papermc.paper:paper-api:1.21.11-R0.1-SNAPSHOT")
    // Plugin PacketEvents installé séparément (entrées de la liste TAB).
    compileOnly("com.github.retrooper:packetevents-spigot:2.14.0")
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")
    // Lecture de phrases.yml dans les tests (fourni par Paper en jeu).
    testImplementation("org.yaml:snakeyaml:2.2")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
}

tasks.processResources {
    filesMatching("plugin.yml") { expand("version" to project.version) }
}
