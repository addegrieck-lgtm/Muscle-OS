plugins {
    java
}

group = "fr.vaeloria"
version = "1.1.0"

java {
    toolchain.languageVersion.set(JavaLanguageVersion.of(21))
}

repositories {
    mavenCentral()
    maven("https://repo.papermc.io/repository/maven-public/")
    maven("https://jitpack.io")
    maven("https://repo.extendedclip.com/releases/")
}

dependencies {
    // Fournies par le serveur : non incluses dans le jar. Gson et Adventure sont embarqués par Paper.
    compileOnly("io.papermc.paper:paper-api:1.21.4-R0.1-SNAPSHOT")
    // Vault est facultatif : la banque de faction s'active seulement s'il est présent.
    compileOnly("com.github.MilkBowl:VaultAPI:1.7.1") { isTransitive = false }
    // PlaceholderAPI est facultatif : placeholders %vfactions_…% s'il est présent.
    compileOnly("me.clip:placeholderapi:2.11.6") { isTransitive = false }
    testImplementation("io.papermc.paper:paper-api:1.21.4-R0.1-SNAPSHOT")
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
}

tasks.processResources {
    inputs.property("version", project.version)
    filesMatching("plugin.yml") { expand("version" to project.version) }
}
